import db from '../../models';
import { filterDataToModel, collectChangedValues } from '../../lib/modelUtils';
import { findByName } from '../enums/statuses';
import { ENTITY_TYPE } from '../../constants';

const { Report } = db;

interface ReportDataType {
  id?: number,
  reportType?: typeof ENTITY_TYPE[keyof typeof ENTITY_TYPE],
  statusId?: number,
  status?: { id?: number, name?: string },
  context?: string,
  startDate?: Date,
  endDate?: Date,
}

interface ReportDescriptor {
  id: number,
  type: string,
  regionId?: number,
}

const syncReport = async (
  data: ReportDataType,
):Promise<{ report: ReportDataType, unmatched: ReportDataType }> => {
  let report;
  const [
    { matched: filteredData, unmatched },
    status,
  ] = await Promise.all([
    filterDataToModel(data, Report),
    (data?.status?.name)
      ? findByName(data?.status.name, data.reportType)
      : Promise.resolve({
        ...(data.statusId && { id: data.statusId }),
      }),
  ]);
  // TODO: check status, map status name to id if needed

  if (filteredData.id) { // sync/update report path
    report = Report.findById(filteredData.id);
    const changedData = collectChangedValues(
      {
        ...filteredData,
        ...(status && { statusId: status.id }),
      },
      report,
    );
    if (changedData && Object.keys(changedData).length > 0) {
      report = await Report.update(
        changedData,
        {
          where: { id: filteredData.id },
          individualHooks: true,
        },
      );
    }
  } else { // new report Path
    report = await Report.create(data); // TODO: have create return the object
  }

  return { report, unmatched };
};

export {
  type ReportDataType,
  type ReportDescriptor,
  syncReport,
};
