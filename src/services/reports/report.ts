import db from '../../models';
import { filterDataToModel, switchAttributeNames, collectChangedValues } from '../../lib/modelUtils';
import { ENTITY_TYPE } from '../../constants';

const { Report } = db;

interface ReportDataType {
  reportId?: number,
  reportType?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
  statusId?: number,
  context?: string,
  startDate?: Date,
  endDate?: Date,
}

interface ReportDescriptor {
  id: number,
  type: string,
  regionId?: number,
}

const reportRemapping: Record<string, string> = {
  reportId: 'id',
};

/**
 * Remaps attribute names in the given data object using the provided reportRemapping.
 * @param {object} data - The data object to be remapped.
 * @returns {object} - The remapped data object.
 */
const dataRemap = (
  data,
) => switchAttributeNames(data, reportRemapping);

/**
 * Filters the given data based on a model and returns the matched and unmatched data.
 * @param data - The data to be filtered.
 * @returns A promise that resolves to an object containing the matched and unmatched data.
 */
const filterData = async (
  data: Record<string, any>,
): Promise<{
  matched: ReportDataType,
  unmatched: Record<string, any>,
}> => filterDataToModel(data, Report);

const syncReport = async (
  data: ReportDataType,
):Promise<ReportDataType> => {
  let report;
  const remappedData = dataRemap(data);
  const { matched: filteredData, unmatched } = await filterData(remappedData);
  // TODO: check status, map status name to id if needed
  // TODO: we should do something with unmatched
  if (filteredData.id) { // sync/update report path
    report = Report.findById(filteredData.id);
    const changedData = collectChangedValues(filteredData, report);
    report = await Report.update(
      changedData,
      { individualHooks: true },
    );
  } else { // new report Path
    report = await Report.create(data); // TODO: have create return the object
  }

  return report; // TODO: make sure the return type is sending reportId and not id
};

export {
  type ReportDataType,
  type ReportDescriptor,
  dataRemap,
  filterData,
  syncReport,
};
