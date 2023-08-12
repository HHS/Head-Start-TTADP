import { filterDataToModel, switchAttributeNames, collectChangedValues } from '../../lib/modelUtils';
import db from '../../models';
import {
  ENTITY_TYPE,
  COLLABORATOR_TYPES,
  AUDIENCE,
  TRAINING_TYPE,
} from '../../constants';
import { ReportDataType, ReportDescriptor, syncReport } from './report';
import { syncReportGoalTemplates } from './reportGoalTemplate';
import { syncCollaboratorsForType } from './reportCollaborator';
import { syncReportNationalCenters } from './reportNationalCenter';
import { syncReportReasons } from './reportReason';
import { syncReportTargetPopulations } from './reportTargetPopulation';

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

const createOrUpdateReportTrainingEvent = async (
  data: ReportTrainingEventDataType,
) => {
  let reportTrainingEvent;
  if (data.id) { // sync/update report path
    reportTrainingEvent = await ReportTrainingEvent.findById(data.id);
    const changedData = collectChangedValues(data, reportTrainingEvent);
    if (changedData.length) {
      await ReportTrainingEvent.update(
        changedData,
        { individualHooks: true },
      );
    }
  } else { // new report Path
    reportTrainingEvent = await ReportTrainingEvent
      .create(data); // TODO: have create return the object
  }
  return reportTrainingEvent;
};

const syncReportTrainingEvent = async (
  data: FullReportTrainingEventDataType,
) => {
  const report = await syncReport({
    ...data,
    ...(!Object.keys(data).includes('reportType') && { reportType: ENTITY_TYPE.REPORT_EVENT }),
  });
  const remappedData = dataRemap(data);
  const { matched: filteredData, unmatched } = await filterData({
    ...remappedData,
    reportId: report.reportId,
  });

  const reportDescriptor: ReportDescriptor = {
    reportId: report.reportId,
    reportType: ENTITY_TYPE.REPORT_EVENT,
    regionId: data.regionId,
  };
  // TODO: handle the unmatched data
  await Promise.all([
    createOrUpdateReportTrainingEvent(filteredData),
    (unmatched.goal)
      ? syncReportGoalTemplates(
        reportDescriptor,
        [{
          ...(unmatched.goalTemplateId && { goalTemplateId: unmatched.goalTemplateId }),
          name: unmatched.goal,
        }],
      )
      : Promise.resolve(),
    (unmatched.owner) // Owner
      ? syncCollaboratorsForType(
        reportDescriptor,
        COLLABORATOR_TYPES.OWNER,
        [unmatched.owner],
      )
      : Promise.resolve(),
    (unmatched.creator) // instatiator
      ? syncCollaboratorsForType(
        reportDescriptor,
        COLLABORATOR_TYPES.INSTANTIATOR,
        [unmatched.creator],
      )
      : Promise.resolve(),
    (unmatched.colaboratorIds) // editor/collaborator
      ? syncCollaboratorsForType(
        reportDescriptor,
        COLLABORATOR_TYPES.EDITOR,
        colaboratorIds,
      )
      : Promise.resolve(),
    (unmatched.reasons) // Reason
      ? syncReportReasons(
        reportDescriptor,
        unmatched.reasons,
      )
      : Promise.resolve(), // Reason
    (unmatched["National Center(s) Requested"]) // TODO: can we get this to a good value, not a string with spaces as a key
      ? syncReportNationalCenters(
        reportDescriptor,
        unmatched["National Center(s) Requested"],
      )
      : Promise.resolve(), // National Center
    (unmatched.targetPopulations) // TODO: can we get this to a good value, not a string with spaces as a key
      ? syncReportTargetPopulations(
        reportDescriptor,
        unmatched.targetPopulations,
      )
      : Promise.resolve(), // target populations
  ]);
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
