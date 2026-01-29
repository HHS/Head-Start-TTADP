import db from '../models';
import {
  baseTRScopes,
} from './helpers';
import { IScopes } from './types';

const {
  EventReportPilot: TrainingReport,
  NationalCenter,
} = db;

export default async function trHoursOfTrainingByNationalCenter(
  scopes: IScopes,
) {
  const [reports, nationalCenters] = await Promise.all([
    TrainingReport.findAll({
      attributes: [
        'data',
      ],
      ...baseTRScopes(scopes),
    }),
    NationalCenter.findAll({
      attributes: [
        'name',
      ],
    }),
  ]) as [
    {
      data: {
        eventId: string,
      },
      sessionReports: {
        data: {
          objectiveTrainers: string[],
          duration: number,
        }
      }[]
    }[],
    {
      name: string,
    }[],
  ];

  const dataStruct = nationalCenters.map((center: { name: string }) => ({
    name: center.name,
    count: 0,
  })) as { name: string, count: number }[];

  const response = reports.reduce((acc, report) => {
    const { sessionReports } = report;
    sessionReports.forEach((sessionReport) => {
      const { objectiveTrainers, duration } = sessionReport.data;

      (objectiveTrainers || []).forEach((trainer) => {
        // trainers were originally and are now stored by the national center abbrev.
        // but looking at the data, there was a period where they were stored as
        // abbrev - user name, so we need to check for that
        const center = dataStruct.find((c) => trainer.includes(c.name));
        if (center) {
          center.count += duration;
        }
      });
    });
    return acc;
  }, dataStruct);

  return response;
}
