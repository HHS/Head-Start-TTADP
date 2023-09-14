import { Model, Op } from 'sequelize';
import { auditLogger } from '../../logger';
import {
  EnumInfo,
  findAll,
} from '../enums/generic';
import { REPORT_TYPE } from '../../constants';
import validFor from '../../models/validFor';

interface ReportGenericEnumType {
  id: number,
  reportId: number,
  enumId: number,
  name: string,
}

// @ts-ignore ts(2430)
interface ReportEnumModel extends Model {
  findAll: (args: {
    attributes: (object | string)[],
    where: object,
    include: object[],
  }) => Promise<ReportGenericEnumType[]>,
  bulkCreate: (
    args: { [x:string]: number, reportId: number }[],
    options: { individualHooks: boolean },
  ) => Promise<ReportGenericEnumType[]>,
  update: (
    args: { updatedAt: Date },
    options: {
      where?: object,
      individualHooks?: boolean,
    },
  ) => Promise<this>,
  destroy: (
    args: {
      where?: object,
      individualHooks?: boolean,
    },
  ) => Promise<ReportGenericEnumType[]>,
}

const getReportGenericEnums = async (
  reportEnumModel: ReportEnumModel,
  enumInfo: EnumInfo,
  report: { id: number, type: string, regionId: number },
  genericEnumIds: number[] | null = null,
):Promise<ReportGenericEnumType[]> => reportEnumModel.findAll({
  attributes: [
    'id',
    'reportId',
    [`"${enumInfo.as}".id`, 'enumId'],
    [`"${enumInfo.as}".name`, 'name'],
  ],
  where: {
    reportId: report.id,
    ...(genericEnumIds && { genericEnumIds }),
  },
  include: [
    {
      model: enumInfo.model,
      as: enumInfo.as,
      where: {
        mapsTo: null,
        ...(enumInfo?.entityTypeFiltered && { validFor: report.type }),
      },
      attributes: [
        'id',
        'name',
      ],
      required: true,
    },
  ],
});

/**
 * Retrieves a generic enum based on the provided parameters.
 * @param reportEnumModel - The model used to retrieve the generic enum.
 * @param enumInfo - Information about the enum.
 * @param report - The report object containing id, type, and regionId.
 * @param genericEnumId - The ID of the generic enum to retrieve.
 * @returns A promise that resolves to an array of objects representing the retrieved generic enums.
 */
const getReportGenericEnum = async (
  reportEnumModel: ReportEnumModel,
  enumInfo: EnumInfo,
  report: { id: number, type: string, regionId: number },
  genericEnumId: number,
): Promise<ReportGenericEnumType[]> => getReportGenericEnums(
  reportEnumModel,
  enumInfo,
  report,
  [genericEnumId],
);

const syncGenericEnums = async (
  model: ReportEnumModel,
  enumInfo: EnumInfo,
  report: { id: number, type: string, regionId: number },
  genericEnums: { id?: number, name?: string }[] | null = null,
): Promise<{
  promises: Promise<[
    void | ReportGenericEnumType[],
    void | ReportEnumModel,
    void | ReportGenericEnumType[],
  ]>,
  unmatched: { id?: number, name?: string }[] | null,
}> => {
  try {
    // in parallel:
    //    validate that the type is valid for the report type
    //    get current collaborators for this report having this type
    const [incomingValidEnums, currentEnums] = await Promise.all([
      findAll(
        enumInfo.model,
        {
          ...(enumInfo?.entityTypeFiltered && { validFor: report.type }),
          [Op.or]: [
            { id: genericEnums.filter(({ id }) => id).map(({ id }) => id) },
            { name: genericEnums.filter(({ name }) => name).map(({ name }) => name) },
          ],
        },
      ),
      getReportGenericEnums(
        model,
        enumInfo,
        report,
      ),
    ]);

    // collect the valid ids, the invalid enums, and the current enum ids
    const [
      incomingValidEnumIds,
      incomingInvalidEnum,
      currentEnumIds,
    ] = [
      incomingValidEnums.map((ive) => ive.id),
      genericEnums.reduce((acc, ge) => {
        const matched = incomingValidEnums
          .find(({ id, name }) => ge.id === id || ge.name === name);
        if (!matched) {
          acc.push(ge);
        }
        return acc;
      }, []),
      currentEnums.map((ce) => ce.id),
    ];
    // filter to the create, update, and destroy lists
    const [
      createList,
      updateList,
      destroyList,
    ] = [
      incomingValidEnumIds.filter((iveId) => !currentEnumIds.includes(iveId)),
      incomingValidEnumIds.filter((iveId) => currentEnumIds.includes(iveId)),
      currentEnumIds.filter((ceId) => incomingValidEnumIds.includes(ceId)),
    ];
    // in parallel:
    //    perform in insert/update/delete based on the sub lists
    //        if a sublist is empty, do not call the db at all for that sublist
    return {
      promises: Promise.all([
        (createList && createList.length)
          ? model.bulkCreate(
            createList.map((id) => ({
              [enumInfo.keyName]: id,
              reportId: report.id,
            })),
            { individualHooks: true },
          )
          : Promise.resolve(),
        (updateList && updateList.length)
          ? model.update(
            {
              updatedAt: new Date(),
            },
            {
              where: {
                [enumInfo.keyName]: updateList,
                reportId: report.id,
              },
              individualHooks: true,
            },
          )
          : Promise.resolve(),
        (destroyList && destroyList.length)
          ? model.destroy({
            where: {
              reportId: report.id,
              [enumInfo.keyName]: destroyList,
            },
            individualHooks: true,
          })
          : Promise.resolve(),
      ]),
      unmatched: incomingInvalidEnum,
    };
  } catch (err) {
    auditLogger.error(err);
    throw err;
  }
};

const includeGenericEnums = (
  model: ReportEnumModel,
  enumInfo: EnumInfo,
  reportType: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => ({
  model,
  as: '', // TODO: figure out how to get this
  attributes: [
    'id',
    [`"${enumInfo.as}".id`, 'enumId'],
    [`"${enumInfo.as}".name`, 'name'],
  ],
  includes: [{
    model: enumInfo.model,
    as: enumInfo.as,
    required: true,
    attributes: [],
    ...(enumInfo?.entityTypeFiltered && {
      includes: [{
        model: validFor,
        as: 'validFor',
        required: true,
        attributes: [],
        where: {
          name: reportType,
          isReport: true,
        },
      }],
    }),
  }],
});

export {
  type EnumInfo,
  type ReportGenericEnumType,
  type ReportEnumModel,
  getReportGenericEnums,
  getReportGenericEnum,
  syncGenericEnums,
  includeGenericEnums,
};
