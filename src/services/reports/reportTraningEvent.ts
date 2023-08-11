import { ReportDataType, syncReport } from './report';
import { filterDataToModel, switchAttributeNames } from '../../lib/modelUtils';
import db from '../../models';
import { AUDIENCE, TRAINING_TYPE } from '../../constants';

const {
  ReportTrainingEvent,
} = db;

interface ReportTrainingEventDataType {
  reportTrainingEventId?: number,
  regionId?: number,
  name?: string,
  organizerId?: number,
  audiance?: typeof AUDIENCE[keyof typeof AUDIENCE],
  trainingType?: typeof TRAINING_TYPE[keyof typeof TRAINING_TYPE],
  vision?: string,
}

interface FullReportTrainingEventDataType
  extends ReportTrainingEventDataType, ReportDataType {}

const dataRemap = (data) => switchAttributeNames(data, reportRemapping);
const filterData = async (
  data,
):Promise<{
  matched: ReportTrainingEventDataType,
  unmatched: Record<string, any>,
}> => filterDataToModel(data, ReportTrainingEvent);

const syncReportTraningEvent = async (
  data: FullReportTrainingEventDataType,
) => {
  let reportTrainingEvent;
  const report = await syncReport(data);
  const { matched: filteredData, unmatched } = await filterData({
    ...data,
    reportId: report.id,
  });

  if (filteredData.id) { // sync/update report path
    reportTrainingEvent = ReportTrainingEvent.findById(filteredData.id);
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
};

const getReportTrainingEvent = async (

  ) => {

  };
