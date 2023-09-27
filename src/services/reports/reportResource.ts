// TODO: how to handle this, check how to pipe everything through the other resource system.
import { collectURLsFromField, findOrCreateResources } from '../resource';
import { REPORT_TYPE } from '../../constants';
import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';
import db from '../../models';

const {
  ReportResource,
  Resource,
} = db;

const syncReportResources = async (
  report: { id: number, type },
  table: { name: string, id: number, column?: string },
  data,
) => {
  const foundUrls = [...new Set(data.flatMap((datum) => collectURLsFromField(datum)))];
  const [
    currentReportResources,
    matchingResources,
  ] = await Promise.all([
    ReportResource.findAll({
      where: {
        reportId: report.id,
        tableName: table.name,
        tableId: table.id,
        ...(table.column
          ? { columnName: table.column }
          : { columnName: null }),
      },
      attributes: [
        'id',
        'resourceId',
      ],
      includes: [{
        model: Resource,
        as: 'resource',
        required: true,
        attributes: [
          'id',
          'url',
        ],
      }],
      raw: true,
    }),
    findOrCreateResources(foundUrls),
  ]);

  const [
    createList,
    updateList,
    destroyList,
  ] = [
    matchingResources
      .filter((mr) => !currentReportResources
        .includes((crr) => crr.resourceId === mr.id))
      .map((mr) => ({
        reportId: report.id,
        resourceId: mr.id,
        tableName: table.name,
        columnName: table.column,
        tableId: table.id,
      })),
    currentReportResources
      .filter((crr) => matchingResources.includes((mr) => mr.id === crr.resourceId))
      .map((crr) => crr.id),
    currentReportResources
      .filter((crr) => !matchingResources.includes((mr) => mr.id === crr.resourceId))
      .map((crr) => crr.id),
  ];

  return {
    promises: Promise.all([
      (createList && createList.length > 0)
        ? ReportResource.bulkCreate(createList, {
          individualHooks: true,
        })
        : Promise.resolve(),
      (updateList && updateList.length > 0)
        ? ReportResource.update(
          { updatedAt: new Date() },
          {
            where: { id: updateList },
            individualHooks: true,
          },
        )
        : Promise.resolve(),
      (destroyList && destroyList.length > 0)
        ? ReportResource.destroy({
          where: { id: destroyList },
          individualHooks: true,
        })
        : Promise.resolve(),
    ]),
    unmapped: null,
  };
};

const includeReportResources = () => ({
  model: ReportResource,
  as: 'reportResorces',
  required: false,
  attributes: [
    'id',
    'resourceId',
    'tableName',
    'columnName',
    'tableId',
  ],
  includes: [{
    model: Resource,
    as: 'resource',
    required: true,
    attributes: [
      'id',
      'url',
      'domain',
      'title',
    ],
  }],
});

const getReportResources = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  table: { name: string, id: number, column?: string },
) => includeToFindAll(
  includeReportResources,
  {
    reportId: report.id,
    tableName: table.name,
    columnName: table.column,
    tableId: table.id,
  },
);

export {
  syncReportResources,
  includeReportResources,
  getReportResources,
};
