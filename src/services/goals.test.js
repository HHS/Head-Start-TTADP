import faker from '@faker-js/faker';
import db, {
  Recipient,
  Grant,
  Goal,
  Objective,
} from '../models';
import {
  reduceObjectives,
  reduceObjectivesForActivityReport,
} from './goals';
import { OBJECTIVE_STATUS } from '../constants';

const objectivesToReduce = [
  {
    id: 1,
    title: ' This has leading and trailing spaces. ',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  },
  {
    id: 2,
    title: 'This has leading and trailing spaces. ',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  },
  {
    id: 3,
    title: ' This has leading and trailing spaces.',
    status: OBJECTIVE_STATUS.IN_PROGRESS,
  },
  {
    id: 4,
    title: 'This doesn\'t leading and trailing spaces.',
    status: OBJECTIVE_STATUS.COMPLETE,
  },
];

describe('Goals DB service', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('reduce objectives', () => {
    let recipient;
    let grant;
    let goal;
    let objectiveOne;
    let objectiveTwo;
    let objectiveThree;
    let objectiveFour;

    beforeAll(async () => {
      // Recipient.
      recipient = await Recipient.create({
        id: faker.datatype.number(),
        name: faker.name.firstName(),
      });

      // Grant.
      grant = await Grant.create({
        id: faker.datatype.number(),
        number: faker.datatype.string(),
        recipientId: recipient.id,
        regionId: 1,
      });

      // Goal.
      goal = await Goal.create({
        name: 'Goal for Objectives with leading and trailing values',
        status: 'Draft',
        endDate: null,
        isFromSmartsheetTtaPlan: false,
        onApprovedAR: false,
        grantId: grant.id,
        createdVia: 'rtr',
      });

      // Objectives.
      objectiveOne = await Objective.create({
        ...objectivesToReduce[0],
        goalId: goal.id,
      });
      objectiveTwo = await Objective.create({
        ...objectivesToReduce[1],
        goalId: goal.id,
      });
      objectiveThree = await Objective.create({
        ...objectivesToReduce[2],
        goalId: goal.id,
      });
      objectiveFour = await Objective.create({
        ...objectivesToReduce[3],
        goalId: goal.id,
      });
    });

    afterAll(async () => {
    // Objectives.
      await Objective.destroy({
        where: {
          id: objectiveOne.id,
        },
      });
      await Objective.destroy({
        where: {
          id: objectiveTwo.id,
        },
      });
      await Objective.destroy({
        where: {
          id: objectiveThree.id,
        },
      });
      await Objective.destroy({
        where: {
          id: objectiveFour.id,
        },
      });

      // Goal.
      await Goal.destroy({
        where: {
          id: goal.id,
        },
      });

      // Grant.
      await Grant.destroy({
        where: {
          id: grant.id,
        },
      });

      // Recipient.
      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });
    });

    it('objective reduce returns the correct number of objectives with spaces', async () => {
      const reducedObjectives = await reduceObjectives(
        [objectiveOne,
          objectiveTwo,
          objectiveThree,
          objectiveFour,
        ],
      );
      expect(reducedObjectives.length).toBe(2);
      expect(reducedObjectives[0].title.trim()).toBe('This has leading and trailing spaces.');
      expect(reducedObjectives[1].title).toBe('This doesn\'t leading and trailing spaces.');
    });

    it('ar reduce returns the correct number of objectives with spaces', async () => {
      const reducedObjectives = await reduceObjectivesForActivityReport(
        [objectiveOne,
          objectiveTwo,
          objectiveThree,
          objectiveFour,
        ],
      );
      expect(reducedObjectives.length).toBe(2);
      expect(reducedObjectives[0].title.trim()).toBe('This has leading and trailing spaces.');
      expect(reducedObjectives[1].title).toBe('This doesn\'t leading and trailing spaces.');
    });
  });
});
