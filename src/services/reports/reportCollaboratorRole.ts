import db from '../../models';
import {
  type EnumInfo,
  type EntityGenericEnum,
  type EnumSyncResponse,
  getEntityGenericEnum,
  syncEntityGenericEnum,
  includeEntityGenericEnums,
} from '../enums/generic';
import { REPORT_TYPE } from '../../constants';

const {
  ReportCollaborator,
  ReportCollaboratorRole,
  Role,
  User,
  UserRole,
} = db;

const rolesEnumInfo:EnumInfo = {
  model: Role,
  as: 'roles',
  keyName: 'roles',
};

const syncReportCollaboratorRoles = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
) => {
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
        where: { reportId: entity.id },
      }],
    }),
    ReportCollaborator.findAll({
      attributes: [
        ['id', 'reportCollaboratorId'],
        ['"userRoles"."roleId"', 'roleId'],
      ],
      where: { reportId: entity.id },
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
          { updatedAt: 'now' }, // TODO: fix
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
) => includeEntityGenericEnums(
  ReportCollaboratorRole,
  rolesEnumInfo,
  { name: 'reportCollaboratorId', type },
);

const getReportCollaboratorRoles = async (
  entity: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  participantIds: number[] | null = null,
):Promise<EntityGenericEnum[]> => getEntityGenericEnum(
  ReportCollaboratorRole,
  rolesEnumInfo,
  { name: 'reportCollaboratorId', ...entity },
  participantIds,
);

export {
  syncReportCollaboratorRoles,
  getReportCollaboratorRoles,
  includeReportCollaboratorRoles,
};
