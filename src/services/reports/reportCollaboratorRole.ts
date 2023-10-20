import { Op } from 'sequelize';
import db from '../../models';
import {
  type EnumInfo,
  type EntityEnumModel,
  type EnumSyncResponse,
  includeGenericEnums,
  getGenericEnums,
  syncGenericEnums,
} from '../enums/generic';
import { REPORT_TYPE } from '../../constants';

const {
  ReportCollaborator,
  ReportCollaboratorRole,
  Role,
  User,
  UserRole,
  sequelize,
} = db;

const collaboratorRolesEnumInfo:EnumInfo = {
  model: ReportCollaboratorRole,
  alias: 'role',
};

// TODO: potential for race condition if the same user is attached to the same report
// for multiple collaborator types at the same time. To address this there is the option
// to use the /lib/semaphore. The current implementation of semaphore, does not allow for
// bucketing by a value, like user.
const syncReportCollaboratorRoles = async (
  entity: { id: number, type?: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  data?: { reportCollaborators: { reportCollaboratorId?: number, userId?: number }[] },
) => {
  const [
    reportCollaboratorIds,
    userIds,
  ] = [
    (data?.reportCollaborators || [])
      .map((rc) => rc?.reportCollaboratorId)
      .filter((rcId) => rcId),
    (data?.reportCollaborators || [])
      .map((rc) => rc?.userId)
      .filter((userId) => userId),
  ];
  const [
    currentCollaboratorRoles,
    currentRolesOfCollaborators,
  ] = await Promise.all([
    ReportCollaboratorRole.findAll({
      attributes: [
        ['id', 'reportCollaboratorRoleId'],
        'reportCollaboratorId',
        'roleId',
      ],
      include: [{
        model: ReportCollaborator,
        as: 'reportCollaborator',
        attributes: [],
        required: true,
        where: {
          reportId: entity.id,
          [Op.or]: [
            {
              ...(reportCollaboratorIds
              && reportCollaboratorIds.length > 0
              && { id: reportCollaboratorIds }),
            },
            {
              ...(userIds
              && userIds.length > 0
              && { id: userIds }),
            },
          ],
        },
      }],
    }),
    ReportCollaborator.findAll({
      attributes: [
        ['id', 'reportCollaboratorId'],
        [sequelize.literal('"userRoles"."roleId"'), 'roleId'],
      ],
      where: {
        reportId: entity.id,
        [Op.or]: [
          {
            ...(reportCollaboratorIds
            && reportCollaboratorIds.length > 0
            && { id: reportCollaboratorIds }),
          },
          {
            ...(userIds
            && userIds.length > 0
            && { id: userIds }),
          },
        ],
      },
      include: [{
        model: User,
        as: 'user',
        attributes: [],
        required: true,
        include: [{
          model: UserRole,
          as: 'userRoles',
          attributes: [],
          required: true,
        }],
      }],
    }),
  ]);

  const [
    insertList,
    updateList,
    deleteList,
  ] = [
    currentRolesOfCollaborators
      .filter(({ reportCollaboratorId, roleId }) => !currentCollaboratorRoles
        .find((ccr) => ccr.reportCollaboratorId === reportCollaboratorId
        && ccr.roleId === roleId)),
    currentCollaboratorRoles
      .filter(({ reportCollaboratorId, roleId }) => currentRolesOfCollaborators
        .find((croc) => croc.reportCollaboratorId === reportCollaboratorId
        && croc.roleId === roleId))
      .map(({ reportCollaboratorRoleId }) => reportCollaboratorRoleId),
    currentCollaboratorRoles
      .filter(({ reportCollaboratorId, roleId }) => !currentRolesOfCollaborators
        .find((croc) => croc.reportCollaboratorId === reportCollaboratorId
        && croc.roleId === roleId))
      .map(({ reportCollaboratorRoleId }) => reportCollaboratorRoleId),
  ];

  return {
    primises: Promise.all([
      insertList && insertList.length > 0
        ? ReportCollaboratorRole.bulkCreate(
          insertList,
          {
            individualHooks: true,
          },
        )
        : Promise.resolve(),
      updateList && updateList.length > 0
        ? ReportCollaboratorRole.update(
          { updatedAt: sequelize.fn('NOW') },
          {
            where: { id: updateList },
            individualHooks: true,
          },
        )
        : Promise.resolve(),
      deleteList && deleteList.length > 0
        ? ReportCollaboratorRole.destroy({
          where: { id: deleteList },
          individualHooks: true,
        })
        : Promise.resolve(),
    ]),
    unmatched: null,
  };
};

const includeReportCollaboratorRoles = (
  type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => includeGenericEnums(
  { name: 'reportCollaboratorId', type },
  collaboratorRolesEnumInfo,
);

const getReportCollaboratorRoles = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  roles: (number | string)[] | null = null,
) => getGenericEnums(
  { name: 'reportCollaboratorId', ...entity },
  collaboratorRolesEnumInfo,
  roles,
);

export {
  syncReportCollaboratorRoles,
  getReportCollaboratorRoles,
  includeReportCollaboratorRoles,
};
