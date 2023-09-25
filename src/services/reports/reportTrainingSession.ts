import { filterDataToModel, collectChangedValues } from '../../lib/modelUtils';
import db from '../../models';
import {
  REPORT_TYPE,
} from '../../constants';

const {
  ReportTrainingSession,
  Organizer,
} = db;

const createOrUpdateReportTrainingSession = async (
  data,
) => {
  let reportTrainingSession;
  if (data.id) { // sync/update report path
    reportTrainingSession = await ReportTrainingSession.findById(data.id);
    const changedData = collectChangedValues(data, reportTrainingSession);
    if (changedData.length) {
      return ReportTrainingSession.update(
        changedData,
        { individualHooks: true },
      );
    }
  } else { // new report Path
    return ReportTrainingSession
      .create(data); // TODO: have create return the object
  }
  return Promise.resolve();
};

const syncReportTrainingSession = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  data,
) => {
  const {
    matched,
    unmatched,
  } = await filterDataToModel(
    {
      ...data,
      reportId: report.id,
      reportType: report.type,
    },
    ReportTrainingSession,
  );

  return {
    promises: Promise.all([
      createOrUpdateReportTrainingSession(matched),
    ]),
    unmatched,
  };
};

const includeReportTrainingSession = async () => ({
  model: ReportTrainingSession,
  as: 'reportTrainingSession',
  required: true,
  attributes: [
    'id',
    'regionId',
    'name',
    'reportTrainingEventId',
    'createdAt',
    'updatedAt',
  ],
});

export {
  syncReportTrainingSession,
  includeReportTrainingSession,
};
