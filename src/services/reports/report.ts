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

/**
 * Synchronizes a report with the given data.
 * @param data - The data to synchronize the report with.
 * @returns An object containing the synchronized report and unmatched data.
 */
const syncReport = async (
  data: ReportDataType,
): Promise<{ report: ReportDataType, unmatched: ReportDataType }> => {
  let report;
  const [
    { matched: filteredData, unmatched },
    status,
  ] = await Promise.all([
    filterDataToModel(data, Report), // Filter the data to match the Report model
    (data?.status?.name)
      ? findByName(data?.status.name, data.reportType) // Find status by name if provided
      : Promise.resolve({
        ...(data.statusId && { id: data.statusId }), // Use statusId if provided
      }),
  ]);

  // TODO: check status, map status name to id if needed

  if (filteredData.id) { // Check if filteredData has an id (existing report)
    report = Report.findByPk(filteredData.id); // Find the existing report
    const changedData = collectChangedValues(
      {
        ...filteredData,
        ...(status && { statusId: status.id }), // Update statusId if status is found
      },
      report,
    );
    if (changedData && Object.keys(changedData).length > 0) { // Check if any data has changed
      report = await Report.update(
        changedData,
        {
          where: { id: filteredData.id }, // Update the existing report
          individualHooks: true,
        },
      );
    }
  } else { // Create a new report
    report = await Report.create(filteredData); // TODO: have create return the object
  }

  return { report, unmatched };
};

export {
  type ReportDataType,
  type ReportDescriptor,
  syncReport,
};
