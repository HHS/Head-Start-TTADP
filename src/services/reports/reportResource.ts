import { DataTypes } from 'sequelize';
import { collectURLsFromField, findOrCreateResources } from '../resource';
import { REPORT_TYPE } from '../../constants';
import {
  filterDataToModel,
  collectChangedValues,
  includeToFindAll,
  getColumnNamesFromModelForType,
} from '../../lib/modelUtils';
import db from '../../models';

const {
  ReportResource,
  Resource,
} = db;

/**
 * Synchronizes report resources with the given data.
 * @param report - The report object containing the report id.
 * @param table - The table object containing the table name, id, and optional column name.
 * @param data - The data to be processed.
 * @returns An object with promises for creating, updating, and destroying report resources,
 * and an unmapped property set to null.
 */
const syncReportResources = async (
  report: { id: number },
  table: { name: string, id: number, column?: string },
  data,
) => {
  // Collect unique URLs from the data
  const foundUrls = [...new Set(data.flatMap((datum) => collectURLsFromField(datum)))];

  // Fetch current report resources and find or create matching resources
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
      include: [{
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

  // Prepare lists for creating, updating, and destroying report resources
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

  // Return an object with promises for creating, updating, and destroying report resources,
  // and set the unmapped property to null
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

/**
 * Checks for syncable report resources.
 * @param report - The report object containing the ID.
 * @param model - The model object.
 * @param id - The ID of the resource.
 * @param data - The data object containing the resource information.
 * @returns A promise that resolves to an array of promises representing the synchronization
 * of report resources.
 */
const checkForSyncableReportResources = async (
  report: { id: number },
  model,
  id,
  data,
) => {
  // Get the table name from the model object
  const { tableName } = model;

  // Get the column names from the model object for the specified data type
  const columns = await getColumnNamesFromModelForType(model, DataTypes.TEXT);

  return Promise.all(
    // Filter the keys of the data object based on the available columns
    Object.keys(data)
      .filter((key) => columns.includes(key))
      // Synchronize the report resources for each key
      .map(async (key) => syncReportResources(
        report,
        {
          name: tableName,
          column: key,
          id,
        },
        [data[key]],
      )),
  );
};

/**
 * includeReportResources is a function that generates an object used for including report
 * resources in a query.
 *
 * @param tableName - The name of the table to filter by.
 * @param tableId - The ID of the table to filter by.
 * @param columnName - The name of the column to filter by. If undefined, all columns will match.
 * @returns An object with properties and values used for including report resources in a query.
 */
const includeReportResources = (
  tableName?: string,
  tableId?: number,
  columnName?: string,
) => ({
  model: ReportResource, // The model to include in the query
  as: 'reportResources', // The alias for the included model
  required: false, // Whether the inclusion is required or optional
  attributes: [
    'id',
    'resourceId',
    'tableName',
    'columnName',
    'tableId',
  ], // The attributes to include from the model
  where: {
    ...(tableName && { tableName }), // Filter by tableName
    ...(tableId && { tableId }), // Filter by tableId
    // Optional filter by columnName if it is defined
    ...(columnName !== undefined && { columnName }),
  },
  include: [{
    model: Resource, // The model to include within the included model
    as: 'resource', // The alias for the nested included model
    required: true, // The nested inclusion is required
    attributes: [
      'id',
      'url',
      'domain',
      'title',
    ], // The attributes to include from the nested model
  }],
});

/**
 * Retrieves report resources based on the provided report and table information.
 * @param report - The report object containing the report ID and type.
 * @param table - The table object containing the table name, ID, and optional column name.
 * @returns A promise that resolves to the report resources.
 */
const getReportResources = async (
  report: { id: number, type?: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  table?: { name?: string, id?: number, column?: string },
) => includeToFindAll(
  includeReportResources, // Include the report resources in the findAll function
  {
    reportId: report.id, // Pass the report ID
    tableName: table?.name, // Pass the table name
    columnName: table?.column, // Pass the column name if available
    tableId: table?.id, // Pass the table ID
  },
);

export {
  syncReportResources,
  checkForSyncableReportResources,
  includeReportResources,
  getReportResources,
};
