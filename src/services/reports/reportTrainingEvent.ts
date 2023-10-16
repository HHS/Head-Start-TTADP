import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';
import db from '../../models';
import {
  REPORT_TYPE,
  TRAINING_TYPE,
} from '../../constants';

const {
  ReportTrainingEvent,
  Organizer,
} = db;

interface ReportTrainingEventDataType {
  id?: number,
  regionId?: number,
  name?: string,
  organizerId?: number,
  trainingType?: typeof TRAINING_TYPE[keyof typeof TRAINING_TYPE],
  vision?: string,
}

const reportTrainingEventRemapping: Record<string, string> = {
  reportTrainingEventId: 'id',
};

const createOrUpdateReportTrainingEvent = async (
  data: ReportTrainingEventDataType,
) => {
  let reportTrainingEvent;
  if (data.id) { // sync/update report path
    reportTrainingEvent = await ReportTrainingEvent.findById(data.id);
    const changedData = collectChangedValues(data, reportTrainingEvent);
    if (changedData.length) {
      return ReportTrainingEvent.update(
        changedData,
        { individualHooks: true },
      );
    }
  } else { // new report Path
    return ReportTrainingEvent
      .create(data); // TODO: have create return the object
  }
  return Promise.resolve();
};

const syncReportTrainingEvent = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  data: ReportTrainingEventDataType,
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
    ReportTrainingEvent,
  );

  return {
    promises: Promise.all([
      createOrUpdateReportTrainingEvent(matched),
    ]),
    unmatched,
  };
};

const includeReportTrainingEvent = () => ({
  model: ReportTrainingEvent,
  as: 'reportTrainingEvents',
  required: true,
  attributes: [
    'id',
    'regionId',
    'name',
    'trainingType',
    'vision',
    'createdAt',
    'updatedAt',
  ],
  include: [
    {
      model: Organizer,
      as: 'organizer',
      required: true,
      attributes: [
        'id',
        'name',
      ],
    },
  ],
});

const getReportTrainingEvent = async (
  reportId: number,
) => includeToFindAll(
  includeReportTrainingEvent,
  {
    reportId,
  },
);

export {
  syncReportTrainingEvent,
  includeReportTrainingEvent,
  getReportTrainingEvent,
};
