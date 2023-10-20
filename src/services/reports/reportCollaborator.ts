import Semaphore from '../../lib/semaphore';
import db from '../../models';
import { auditLogger } from '../../logger';
import { REPORT_TYPE, COLLABORATOR_TYPES } from '../../constants';
import {
  filterDataToModel,
  remap,
  collectChangedValues,
  includeToFindAll,
} from '../../lib/modelUtils';
import { camelToPascalCase } from '../../models/helpers/associationsAndScopes';
import {
  includeReportCollaboratorRoles,
} from './reportCollaboratorRole';
import {
  syncReportCollaboratorTypes,
  includeReportCollaboratorTypes,
} from './reportCollaboratorType';

const semaphore = new Semaphore(1);

/* TODO: need to incorporate the validation that the users referenced have the required
    permissions. To do this we need some discrete method to corelate the permissions with
    the collaborator type. */

const {
  CollaboratorType,
  ReportCollaborator,
  ReportCollaboratorType,
  Role,
  User,
} = db;

const createOrUpdateReportCollaborators = async (
  reportId: number,
  userIds: number[],
) => {
  // As there are multiple types of collaborator roles held by a user, this path might
  // try to be hit in parallel for a single set of data. To protect the process a semaphore
  // is used to limit the parallel execution of the sensitive step.
  await semaphore.acquire();
  const newReportCollaborators = await ReportCollaborator.bulkCreate(
    userIds.map((userId) => ({ userId, reportId })),
    {
      updateOnDuplicate: ['updatedAt'],
      individualHooks: true,
      returning: true,
    },
  );
  semaphore.release();
  return newReportCollaborators;
};

const syncReportCollaboratorsForType = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE], regionId: number },
  collaboratorType: number | typeof COLLABORATOR_TYPES[keyof typeof COLLABORATOR_TYPES],
  userIds: number[],
) => {
  try {
    // in parallel:
    //    validate that the type is valid for the report type
    //    get current collaborators for this report having this type
    const [
      validateType,
      currentReportCollaborators,
    ] = await Promise.all([
      CollaboratorType.findOne({
        where: {
          ...(typeof collaboratorType === 'number' && { id: collaboratorType }),
          ...(typeof collaboratorType !== 'number' && { name: collaboratorType }),
          validFor: report.type,
        },
      }),
      ReportCollaborator.findAll({
        where: {
          reportId: report.id,
          userId: userIds,
        },
        include: [
          {
            model: CollaboratorType,
            as: 'collaboratorTypeForReportCollaboratorTypes',
            required: false,
            where: {
              validFor: report.type,
              ...(typeof collaboratorType === 'number' && { id: collaboratorType }),
              ...(typeof collaboratorType !== 'number' && { name: collaboratorType }),
              mapsTo: null,
            },
            attributes: [
              'id',
              'name',
            ],
            through: {
              attributes: [],
            },
          },
        ],
        raw: true,
      }),
    ]);
    // filter to the create, update, and destroy lists
    if (!validateType) {
      throw new Error(`Invalid collaboratorType of "${collaboratorType}" passed for a report of type "${report.type}"`);
    }
    const collaboratorTypeId = validateType.id;
    const currentReportCollaboratorUserIds = currentReportCollaborators.map(({ userId }) => userId);
    const [
      createCollaboratorList,
      createCollaboratorTypeList,
      updateCollaboratorTypeList,
      destroyCollaboratorTypeList,
    ] = [
      userIds
        .filter((userId) => !(currentReportCollaboratorUserIds.includes(userId))),
      currentReportCollaborators
        .filter((crc) => (
          userIds.includes(crc.userId)
          && crc.collaboratorTypes.id === null))
        .map((crc) => crc.id),
      currentReportCollaborators
        .filter((crc) => (
          userIds.includes(crc.userId)
          && crc.collaboratorTypes.id === collaboratorTypeId))
        .map((crc) => crc.id),
      currentReportCollaborators
        .filter((crc) => (
          !userIds.includes(crc.userId)
          && crc.collaboratorTypes.id === collaboratorTypeId))
        .map((crc) => crc.id),
    ];

    let fullCreateCollaboratorTypeList;
    if (createCollaboratorList && createCollaboratorList.length) {
      const newReportCollaborators = await createOrUpdateReportCollaborators(
        report.id,
        createCollaboratorList,
      );
      fullCreateCollaboratorTypeList = [
        // TODO: this will likely need some cleanup to only get the required values.
        ...newReportCollaborators,
        ...createCollaboratorTypeList,
      ];
    } else {
      fullCreateCollaboratorTypeList = createCollaboratorTypeList;
    }
    // in parallel:
    //    perform in insert/update/delete based on the sub lists
    //        if a sublist is empty, do not call the db at all for that sublist
    return await Promise.all([
      (fullCreateCollaboratorTypeList && fullCreateCollaboratorTypeList.length)
        ? ReportCollaboratorType.bulkCreate(
          fullCreateCollaboratorTypeList.map((reportCollaboratorId) => ({
            reportCollaboratorId,
            collaboratorTypeId,
          })),
          { individualHooks: true },
        )
        : Promise.resolve(),
      (updateCollaboratorTypeList && updateCollaboratorTypeList.length)
        ? ReportCollaboratorType.update(
          {
            updatedAt: new Date(),
          },
          {
            where: {
              reportCollaboratorId: updateCollaboratorTypeList,
              collaboratorTypeId,
            },
            individualHooks: true,
          },
        )
        : Promise.resolve(),
      (destroyCollaboratorTypeList && destroyCollaboratorTypeList.length)
        ? ReportCollaboratorType.destroy({
          where: {
            reportCollaboratorId: destroyCollaboratorTypeList,
            collaboratorTypeId,
          },
          individualHooks: true,
        })
        : Promise.resolve(),
    ]);
  } catch (err) {
    auditLogger.error(err);
    throw err;
  }
};

const syncReportCollaborator = async (
  report: { id: number, type: string, regionId: number },
  collaboratorType: number | string,
  data: object,
) => {
  // TODO: everything
};

const includeReportCollaborator = (
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
  collaboratorType: typeof COLLABORATOR_TYPES[keyof typeof COLLABORATOR_TYPES],
) => ({
  model: ReportCollaborator,
  as: `reportCollaboratorAs${camelToPascalCase(collaboratorType)}s`, // TODO: fix using the collaboratorType
  required: false,
  attributes: [
    'reportId',
    'userId',
  ],
  include: [
    includeReportCollaboratorTypes(collaboratorType),
    includeReportCollaboratorRoles(collaboratorType),
    {
      model: User,
      as: 'user',
      required: true,
      attributes: [
        'name',
        'email',
        'homeRegionId',
      ],
    },
  ],
});

const getCollaboratorsForType = async (
  report: { id: number, type: string, regionId: number },
  collaboratorType: number | string,
):Promise<object[]> => includeToFindAll(
  includeReportCollaborator,
  {
    reportId: report.id,
  },
  [
    report.type,
    collaboratorType,
  ],
);

export {
  syncReportCollaboratorsForType,
  getCollaboratorsForType,
  includeReportCollaborator,
};
