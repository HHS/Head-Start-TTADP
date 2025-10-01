import db from '../models';
import {
  baseTRScopes,
  getAllTopicsForWidget,
} from './helpers';
import { IScopes } from './types';

const {
  TrainingReport,
} = db;

export default async function trSessionByTopic(
  scopes: IScopes,
) {
  const [reports, topics] = await Promise.all([
    TrainingReport.findAll({
      attributes: [
        'data',
      ],
      ...baseTRScopes(scopes),
    }),
    getAllTopicsForWidget(),
  ]) as [
    {
      data: {
        eventId: string,
      },
      sessionReports: {
        data: {
          objectiveTopics: string[],
        }
      }[]
    }[],
    {
      name: string,
    }[],
  ];

  const dataStruct = topics.map((topic: { name: string }) => ({
    topic: topic.name,
    count: 0,
  })) as { topic: string, count: number }[];

  const response = reports.reduce((acc, report) => {
    const { sessionReports } = report;
    sessionReports.forEach((sessionReport) => {
      const { objectiveTopics } = sessionReport.data;

      objectiveTopics.forEach((topic) => {
        const d = dataStruct.find((c) => c.topic === topic);
        if (d) {
          d.count += 1;
        }
      });
    });
    return acc;
  }, dataStruct);

  return response;
}
