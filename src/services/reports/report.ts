import db from '../../models';
import { filterDataToModel, switchAttributeNames } from '../../lib/modelUtils';
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

const reportRemapping: Record<string, string> = {
  reportId: 'id',
};

const dataRemap = (data) => switchAttributeNames(data, reportRemapping);
const filterData = async (
  data,
):Promise<{
  matched: ReportDataType,
  unmatched: Record<string, any>,
}> => filterDataToModel(data, Report);

const syncReport = async (
  data: ReportDataType,
) => {
  let report;
  const remappedData = dataRemap(data);
  const { matched: filteredData, unmatched } = await filterData(remappedData);
  // TODO: we should do something with unmatched
  if (filteredData.id) { // sync/update report path
    report = Report.findById(filteredData.id);
    Object.entries(filteredData)
      .forEach(([key, value]) => {
        if (data[key] !== report[key]) {
          report[key] = data[key];
        }
      });
    report.save();
  } else { // new report Path
    report = await Report.create(data); // TODO: have create return the object
  }

  return report;
};

export {
  type ReportDataType,
  dataRemap,
  filterData,
  syncReport,
};
