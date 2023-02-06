import faker from '@faker-js/faker';
import { calculateGoalsAndObjectives } from '../components/ApprovedReportV1';

describe('calculateGoalsAndObjectives', () => {
  it('should return an array of two arrays, each of which contains strings', () => {
    const title = 'Gabba Gabba Hey';
    const ttaProvided = 'We did a thing';

    const report = {
      goalsAndObjectives: [],
      objectivesWithoutGoals: [
        {
          id: 1234,
          otherEntityId: 10,
          goalId: null,
          title,
          status: 'Complete',
          onAR: true,
          onApprovedAR: true,
          topics: [],
          resources: [],
          files: [],
          value: 17762,
          ids: [
            17762,
          ],
          ttaProvided,
          arOrder: 1,
        },
      ],
    };

    const result = calculateGoalsAndObjectives(report);
    expect(result).toStrictEqual([
      [
        'Objective 1',
        'TTA Provided 1',
      ],
      [
        title,
        ttaProvided,
      ],
    ]);
  });
});
