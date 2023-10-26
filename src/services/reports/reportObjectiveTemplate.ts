import { Op } from 'sequelize';
import { REPORT_TYPE } from '../../constants';
import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';
import db from '../../models';

import { includeReportObjectiveTemplateFiles } from './reportObjectiveTemplateFile';
import { includeReportObjectiveTemplateResources } from './reportObjectiveTemplateResource';
import { includeReportObjectiveTemplateTopics } from './reportObjectiveTemplateTopic';
import { includeReportObjectiveTemplateTrainers } from './reportObjectiveTemplateTrainer';

const {
  ReportObjectiveTemplate,
  ObjectiveTemplate,
  SupportTypes,
  Statuses,
} = db;

const getCurrentReportObjectiveTemplates = async (
  reportId: number,
): Promise<{
  id: number,
  reportId: number,
  objectiveTemplateId: number,
}[]> => ReportObjectiveTemplate.findAll({
  attributes: [
    ['id'],
    ['reportId'],
    ['objectiveTemplateId'],
  ],
  where: {
    reportId,
  },
  include: [
    {
      model: ObjectiveTemplate,
      as: 'objectiveTemplate',
    },
  ],
  raw: true,
});

const getMatchingObjectiveTemplates = async (
  objectiveTemplates: ({ objectiveTemplateId?: number, title?: string, regionId?: number })[],
): Promise<{
  objectiveTemplateId: number,
  title: string,
  regionId: number | null,
  creationMethod,
  isFoiaable: boolean,
  isReferenced: boolean,
}[]> => ObjectiveTemplate.findAll({
  attributes: [
    ['id', 'objectiveTemplateId'], // Rename id column to goalTemplateId
    ['templateTitle', 'title'], // Rename templateName column to name
    ['regionId'], // Include regionId column
    'creationMethod',
    'isFoiaable',
    'isReferenced',
  ],
  where: {
    [Op.or]: [
      ...objectiveTemplates.map(({ objectiveTemplateId, title, regionId }) => ({
        [Op.and]: {
          [Op.or]: {
            ...(objectiveTemplateId && { id: objectiveTemplateId }),
            ...(title && { templateTitle: title }),
          },
          ...(regionId
            ? { regionId }
            : { regionId: null }),
        },
      })),
    ],
  },
  raw: true, // Return raw data instead of Sequelize models
});

const syncReportObjectiveTemplates = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  data,
) => {
  const filteredData = await Promise.all(data.map(async (datum) => filterDataToModel(
    {
      ...datum,
      reportId: report.id,
      reportType: report.type,
    },
    ReportObjectiveTemplate,
  )));

  const [
    currentReportObjectiveTemplates,
    matchingObjectiveTemplates,
  ] = await Promise.all([
    getCurrentReportObjectiveTemplates(report.id),
    getMatchingObjectiveTemplates(filteredData.map(({
      id,
      title,
      regionId,
    }) => ({
      ...(id && { objectiveTemplateId: id }),
      ...(title && { title }),
      ...(regionId && { regionId }),
    }))),
  ]);

  const newObjectiveTemplates = await Promise.all(filteredData
    .filter((objectiveTemplate) => (
      !(
        (
          objectiveTemplate?.objectiveTemplateId
          && matchingObjectiveTemplates
            .filter(({ regionId }) => regionId === objectiveTemplate?.regionId)
            .map(({ objectiveTemplateId }) => objectiveTemplateId)
            .includes(objectiveTemplate.objectiveTemplateId)
        ) || (
          objectiveTemplate?.title
          && matchingObjectiveTemplates
            .filter(({ regionId }) => regionId === objectiveTemplate?.regionId)
            .map(({ title }) => title)
            .includes(objectiveTemplate.title)
        )
      )
    ))
    .map(async (objectiveTemplate) => ObjectiveTemplate.create(
      {
        templateTitle: objectiveTemplate.title,
        regionId: objectiveTemplate.regionId,
        creationMethod: null, // TODO: figure out what should go here
      },
      {
        attributes: [
          ['id', 'objectiveTemplateId'],
          ['templateTitle'],
          ['regionId'],
        ],
        raw: true,
      },
    )));

  const deltaLists = {
    createList: [
      // From new objectives templates
      ...newObjectiveTemplates.map(({
        objectiveTemplateId,
        templateTitle,
      }) => ({
        reportId: report.id,
        objectiveTemplateId,
        templateTitle,
        ...filteredData.find((fd) => fd.templateTitle === templateTitle),
      })),
      // From matched text from existing objective templates
      ...matchingObjectiveTemplates
        .filter(({ title, regionId }) => filteredData.find((fd) => (
          title === fd.title
          && (regionId === fd.regionId || regionId === null)
          && fd.objectiveTemplateId === undefined
        )))
        .map(({
          objectiveTemplateId,
          title,
          regionId,
        }) => ({
          reportId: report.id,
          objectiveTemplateId,
          ...filteredData
            .find((fd) => fd.templateTitle === title),
          templateTitle: title,
          regionId,
        })),
      // From existing objective templates
      ...matchingObjectiveTemplates
        .filter(({ objectiveTemplateId }) => filteredData.find((fd) => (
          objectiveTemplateId === fd.objectiveTemplateId
        )))
        .map(({
          objectiveTemplateId,
          title,
          regionId,
        }) => ({
          reportId: report.id,
          objectiveTemplateId,
          ...filteredData
            .find((fd) => fd.templateTitle === title),
          templateTitle: title,
          regionId,
        })),
      ...filteredData
        .filter(({ objectiveTemplateId }) => objectiveTemplateId
        && !currentReportObjectiveTemplates
          .map((
            currentReportObjectiveTemplate,
          ) => currentReportObjectiveTemplate.objectiveTemplateId)
          .includes(objectiveTemplateId)),
    ],
    updateList: filteredData
      .map((fd) => {
        const currentReportObjectiveTemplate = currentReportObjectiveTemplates
          .filter((crot) => crot.objectiveTemplateId === fd.objectiveTemplateId);
        return ({
          id: currentReportObjectiveTemplate?.[0].id,
          ...collectChangedValues(fd, currentReportObjectiveTemplate?.[0]),
        });
      })
      .filter(({ id }) => id),
    removeList: currentReportObjectiveTemplates
      .filter((currentReportObjectiveTemplate) => !filteredData
        .map(({ objectiveTemplateId }) => objectiveTemplateId)
        .includes(currentReportObjectiveTemplate.objectiveTemplateId))
      .map(({ id }) => id),
  };

  return {
    promises: Promise.all([
      deltaLists.createList
      && deltaLists.createList.length > 0
        ? ReportObjectiveTemplate.bulkCreate(deltaLists.createList)
        : Promise.resolve(),
      deltaLists.updateList
      && deltaLists.updateList.length > 0
        ? Promise.all(deltaLists.updateList
          .map(async (updateData) => ReportObjectiveTemplate.update(
            updateData,
            {
              where: { id: updateData.id },
              individualHooks: true,
            },
          )))
        : Promise.resolve(),
      deltaLists.removeList
      && deltaLists.removeList.length > 0
        ? ReportObjectiveTemplate.destroy({
          where: {
            id: deltaLists.removeList,
          },
          individualHooks: true,
        })
        : Promise.resolve(),
    ]),
    unmatched: filteredData.map(({ unmapped }) => unmapped),
  };
};

const includeReportObjectiveTemplates = () => ({
  model: ReportObjectiveTemplate,
  as: 'reportObjectiveTemplates',
  required: false,
  attributes: [
    'reportId',
    'objectiveTemplateId',
    'reportGoalTemplateId',
    'supportTypeId',
    'templateTitle',
    'ttdProvided',
    'isActivelyEdited',
    'statusId',
    'ordinal',
  ],
  include: [
    includeReportObjectiveTemplateFiles(),
    includeReportObjectiveTemplateResources(),
    includeReportObjectiveTemplateTopics(),
    includeReportObjectiveTemplateTrainers(),
    {
      model: SupportTypes,
      as: 'supportType',
      required: true,
      attributes: [
        'id',
        'name',
      ],
    },
    {
      model: Statuses,
      as: 'status',
      required: true,
      attributes: [
        'id',
        'name',
      ],
    },
  ],
});

const getReportObjectiveTemplates = async (
  reportId: number,
  objectiveTemplateIds: number[] | null = null,
) => includeToFindAll(
  includeReportObjectiveTemplates,
  {
    reportId,
    ...(objectiveTemplateIds
      && objectiveTemplateIds.length > 0
      && { objectiveTemplateId: objectiveTemplateIds }),
  },
);

export {
  syncReportObjectiveTemplates,
  includeReportObjectiveTemplates,
  getReportObjectiveTemplates,
};
