import { ReportDataType, syncReport } from './report';
import { filterDataToModel, switchAttributeNames, collectChangedValues } from '../../lib/modelUtils';
import db from '../../models';
import { ENTITY_TYPE, AUDIENCE, TRAINING_TYPE } from '../../constants';

const {
  Report,
  ReportTrainingEvent,
} = db;

interface ReportTrainingEventDataType {
  id?: number,
  regionId?: number,
  name?: string,
  organizerId?: number,
  audiance?: typeof AUDIENCE[keyof typeof AUDIENCE],
  trainingType?: typeof TRAINING_TYPE[keyof typeof TRAINING_TYPE],
  vision?: string,
}

interface FullReportTrainingEventDataType
  extends ReportTrainingEventDataType, ReportDataType {}

const reportTrainingEventRemapping: Record<string, string> = {
  reportTrainingEventId: 'id',
};

/**
 * Remaps attribute names in the given data object using a provided remapping function.
 * @param data - The data object to be remapped.
 * @returns The remapped data object.
 */
const dataRemap = (
  data: Record<string, any>,
) => switchAttributeNames(data, reportTrainingEventRemapping);

/**
 * This function filters the given data object and separates it into two parts:
 * - matched: an object that contains only the properties that match the structure of
 *            ReportTrainingEventDataType
 * - unmatched: an object that contains the remaining properties that do not match the
 *              structure of ReportTrainingEventDataType
 *
 * @param data - The data object to be filtered
 * @returns A promise that resolves to an object with two properties: matched and unmatched
 */
const filterData = async (
  data: Record<string, any>,
): Promise<{
  matched: ReportTrainingEventDataType,
  unmatched: Record<string, any>,
}> => filterDataToModel(data, ReportTrainingEvent);

const syncReportTrainingEvent = async (
  data: FullReportTrainingEventDataType,
) => {
  let reportTrainingEvent;

  const report = await syncReport({
    ...data,
    ...(!Object.keys(data).includes('reportType') && { reportType: ENTITY_TYPE.REPORT_EVENT }),
  });
  const remappedData = dataRemap(data);
  const { matched: filteredData, unmatched } = await filterData({
    ...remappedData,
    reportId: report.id,
  });
  // TODO: handle the unmatched data
  if (filteredData.id) { // sync/update report path
    reportTrainingEvent = ReportTrainingEvent.findById(filteredData.id);
    const changedData = collectChangedValues(filteredData, reportTrainingEvent);
    if (changedData.length) {
      await ReportTrainingEvent.update(
        changedData,
        { individualHooks: true },
      );
    }
  } else { // new report Path
    reportTrainingEvent = await ReportTrainingEvent
      .create(filteredData); // TODO: have create return the object
  }
};

const getReportTrainingEvents = async (
  reportIds?: number[],
) => Report.findAll({
  attributes: [],
  where: {
    id: reportIds,
    reportType: ENTITY_TYPE.REPORT_EVENT,
  },
  includes: [
    {
      model: ReportTrainingEvent,
      as: 'reportTrainingEvent',
      required: true,
      attributes: [],
    },
    // TODO: add the other table includes here
  ],
});

const getReportTrainingEvent = async (
  reportId: number,
) => getReportTrainingEvents([reportId]);

export {
  dataRemap,
  filterData,
  syncReportTrainingEvent,
  getReportTrainingEvents,
  getReportTrainingEvent,
};
