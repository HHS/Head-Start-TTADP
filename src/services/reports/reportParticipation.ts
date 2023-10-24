/* eslint-disable @typescript-eslint/no-explicit-any */
import { syncReportParticipationParticipants, includeReportParticipationParticipants } from './reportParticipationParticipant';
import { REPORT_TYPE } from '../../constants';
import db from '../../models';
import { filterDataToModel, collectChangedValues, includeToFindAll } from '../../lib/modelUtils';

const {
  ReportParticipation,
} = db;

/**
 * includeReportParticipation function.
 * @param type - The type of report.
 * @returns An object with the necessary configuration for including report participations.
 */
const includeReportParticipation = (
  type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE],
) => ({
  model: ReportParticipation, // The model to include in the query.
  as: 'reportParticipations', // The alias for the included model.
  required: false, // Whether the inclusion is optional or not.
  attributes: [ // The attributes to include from the included model.
    'participantCount',
    'inpersonParticipantCount',
    'virtualParticipantCount',
  ],
  include: [ // Additional includes for the included model.
    includeReportParticipationParticipants(type),
  ],
});

/**
 * Retrieves the report participation for a given report ID.
 * @param reportId - The ID of the report.
 * @returns A promise that resolves to the report participation.
 */
const getReportParticipation = async (
  reportId: number,
) => includeToFindAll(
  includeReportParticipation,
  {
    reportId,
  },
);

/**
 * Synchronizes report participation data with the database.
 *
 * @param report - The report object containing the report ID and type.
 * @param data - The data object containing participant counts and details.
 * @returns An object containing promises for any updates made and unmatched participants.
 */
const syncReportParticipation = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  data: {
    participantCount?: number,
    inpersonParticipantCount?: number,
    virtualParticipantCount?: number,
    participants: { id?: number, name?: string }[],
  },
) => {
  const phase1 = await Promise.all([
    getReportParticipation(report.id),
    filterDataToModel(data, ReportParticipation),
  ]);

  let reportParticipation = phase1[0];
  const {
    matched: filteredData,
    unmatched,
  } = phase1[1];
  let reportParticipationUpdate: Promise<any>;

  // create id not exists
  if (!reportParticipation) {
    reportParticipation = await ReportParticipation.create({
      reportId: report.id,
    });
  } else {
    const deltaDate = collectChangedValues(filteredData, reportParticipation[0].dataValues);
    // update value if already exists, based
    // not awaited so the promise can be returned, that way it can be awaited with other awaits
    reportParticipationUpdate = ReportParticipation.update(
      deltaDate,
      {
        where: {
          id: reportParticipation.id,
          reportId: report.id,
        },
        individualHooks: true,
      },
    );
  }

  const {
    promises: participantPromises,
    unmatched: participantUnmatched,
  } = await syncReportParticipationParticipants(
    { id: reportParticipation.id, type: report.type },
    data.participants,
  );

  return {
    promises: [
      ...(reportParticipationUpdate && [reportParticipationUpdate]),
      ...(participantPromises && [participantPromises]),
    ],
    unmatched: {
      ...unmatched,
      ...(participantUnmatched.length && { participants: participantUnmatched }),
    },
  };
};

export {
  syncReportParticipation,
  includeReportParticipation,
  getReportParticipation,
};
