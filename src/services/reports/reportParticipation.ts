import { syncReportParticipationParticipants } from "./reportParticipationParticipant";
import { REPORT_TYPE } from '../../constants';
import db from '../../models';

const {
  ReportParticipation,
} = db;

const syncReportParticipation = async (
  report: { id: number, type: typeof REPORT_TYPE[keyof typeof REPORT_TYPE] },
  data: {
    participantCount?: number,
    inpersonParticipantCount?: number,
    virtualParticipantCount?: number,
    participants: { id?: number, name?: string }[],
  },
) => {
  // TODO: find record if exists
  let reportParticipation = await ReportParticipation.findOne({
    attributes: [], //TODO fix
    where: { reportId: report.id },
  });
  let reportParticipationUpdate: Promise<any>;
  // create id not exists
  if (!reportParticipation) {
    reportParticipation = await ReportParticipation.create({
      reportId: report.id,
    });
  } else {
    // not awaited so the promise can be returned, that way it can be awaited with other awaits
    reportParticipationUpdate = ReportParticipation.update(
      {}, // TODO: delta data
      {
        where: {
          id: reportParticipation.id,
          reportId: report.id,
        },
        individualHooks: true,
      },
    );
  }
  // update value if already exists, based
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
      ...(Object.keys(participantUnmatched).length
      && { participants: participantUnmatched }),
    },
  };
};
