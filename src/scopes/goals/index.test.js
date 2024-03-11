import { Op, col } from 'sequelize';
import faker from '@faker-js/faker';
import {
  createReport, destroyReport, createGoal, createGrant,
} from '../../testUtils';
import filtersToScopes from '../index';
import db, {
  Goal,
  Objective,
  ActivityReportObjective,
  Recipient,
  ObjectiveTopic,
  Topic,
  Grant,
  Group,
  GroupGrant,
  User,
  Resource,
  ActivityReportGoal,
  ActivityReportGoalResource,
  ActivityReportObjectiveResource,
  ActivityReportResource,
  NextStep,
  NextStepResource,
  ActivityReportFile,
  ActivityReportObjectiveFile,
  GroupCollaborator,
  File,
} from '../../models';

const REGION_ID = 10;

describe('goal filtersToScopes', () => {
  let reportIds;
  let objectiveIds = [];
  let possibleGoalIds = [];
  let emptyReport;
  let reportWithReasons;
  let reportWithTopics;
  let grant;
  let topicsGrant;
  let reasonsGrant;
  let otherGrant;
  let goalGrant;
  let activityReportGoalIds;
  const ots = [];

  beforeAll(async () => {
    goalGrant = await createGrant();
    grant = await createGrant({ regionId: REGION_ID, number: 'BROC1234' });
    topicsGrant = await createGrant({ regionId: REGION_ID, number: 'DSWEC56R78' });
    reasonsGrant = await createGrant({ regionId: REGION_ID, number: 'JNDC532548' });
    otherGrant = await createGrant({ regionId: 11, number: 'CAUL4567' });

    emptyReport = await createReport({
      activityRecipients: [],
      calculatedStatus: 'approved',
      reason: [],
      topics: [],
      region: 15,
    });
    reportWithReasons = await createReport({
      calculatedStatus: 'approved',
      reason: ['Full Enrollment'],
      topics: ['CLASS: Emotional Support'],
      activityRecipients: [{ grantId: reasonsGrant.id }],
      region: 15,
    });
    reportWithTopics = await createReport({
      calculatedStatus: 'approved',
      reason: ['Complaint'],
      activityRecipients: [{ grantId: topicsGrant.id }],
      topics: ['Behavioral / Mental Health / Trauma'],
      region: REGION_ID,
    });

    const goals = await Promise.all(
      [
        // goal for reasons
        await Goal.create({
          name: 'Goal 1',
          status: null,
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
          grantId: reasonsGrant.id,
          isRttapa: 'Yes',
        }),
        // goal for topics
        await Goal.create({
          name: 'Goal 2',
          status: 'Not Started',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
          grantId: topicsGrant.id,
          isRttapa: 'Yes',
        }),
        // goal for status
        await Goal.create({
          name: 'Goal 3',
          status: 'In Progress',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
          grantId: goalGrant.id,
          isRttapa: 'No',
        }),
        // goal for status
        await Goal.create({
          name: 'Goal 4',
          status: null,
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-02'),
          grantId: goalGrant.id,
          isRttapa: 'No',
        }),
        // goal for startDate
        await Goal.create({
          name: 'Goal 5',
          status: 'Suspended',
          timeframe: '12 months',
          isFromSmartsheetTtaPlan: false,
          createdAt: new Date('2021-01-10'),
          grantId: goalGrant.id,
        }),
      ],
    );

    // Activity Report Goals.
    const activityReportGoals = await Promise.all(
      [
        ActivityReportGoal.create({
          activityReportId: reportWithReasons.id,
          goalId: goals[0].id,
          status: goals[0].status,
        }),
        ActivityReportGoal.create({
          activityReportId: reportWithTopics.id,
          goalId: goals[1].id,
          status: goals[1].status,
        }),
      ],
    );

    activityReportGoalIds = activityReportGoals.map((o) => o.id);

    const objectives = await Promise.all(
      [
        // goal for reasons
        await Objective.create({
          goalId: goals[0].id,
          title: 'objective 1',
          topics: [],
          status: 'Not Started',
        }),
        // goal for topics
        await Objective.create({
          goalId: goals[1].id,
          title: 'objective 2',
          topics: ['Behavioral / Mental Health / Trauma'],
          status: 'Not Started',
        }),
        // goal for status
        await Objective.create({
          goalId: goals[2].id,
          title: 'objective 3',
          status: 'Not Started',
        }),
        // goal for startDate
        await Objective.create({
          goalId: goals[3].id,
          title: 'objective 4',
          status: 'Not Started',
        }),
      ],
    );
    const [topicOne] = await Topic.findOrCreate({
      where: {
        name: 'CLASS: Emotional Support',
      },
    });

    const [topicTwo] = await Topic.findOrCreate({
      where: {
        name: 'Behavioral / Mental Health / Trauma',
      },
    });

    ots.push(await ObjectiveTopic.create({
      objectiveId: objectives[0].id,
      topicId: topicOne.id,
    }));

    ots.push(await ObjectiveTopic.create({
      objectiveId: objectives[1].id,
      topicId: topicTwo.id,
    }));

    await Promise.all(
      [
        // goal for reasons
        await ActivityReportObjective.create({
          objectiveId: objectives[0].id,
          activityReportId: reportWithReasons.id,
          ttaProvided: 'asdfadf',
          status: objectives[0].status,
        }),
        // goal for topics
        await ActivityReportObjective.create({
          objectiveId: objectives[1].id,
          activityReportId: reportWithTopics.id,
          ttaProvided: 'asdfadf',
          status: objectives[1].status,
        }),
        // goal for status
        await ActivityReportObjective.create({
          objectiveId: objectives[2].id,
          activityReportId: emptyReport.id,
          ttaProvided: 'asdfadf',
          status: objectives[2].status,
        }),
        // goal for startDate
        await ActivityReportObjective.create({
          objectiveId: objectives[3].id,
          activityReportId: emptyReport.id,
          ttaProvided: 'asdfadf',
          status: objectives[3].status,
        }),
      ],
    );

    goals.push(await createGoal({ status: 'Suspended', name: 'Goal 6', grantId: grant.id }));
    goals.push(await createGoal({ status: 'Closed', name: 'Goal 7', grantId: otherGrant.id }));

    reportIds = [emptyReport.id, reportWithReasons.id, reportWithTopics.id];
    objectiveIds = objectives.map((o) => o.id);
    possibleGoalIds = goals.map((g) => g.id);
  });

  afterAll(async () => {
    await ActivityReportObjective.destroy({
      where: {
        activityReportId: reportIds,
      },
      individualHooks: true,
    });

    await ObjectiveTopic.destroy({
      where: {
        id: ots.map((ot) => ot.id),
      },
      individualHooks: true,
    });

    await Objective.destroy({
      where: {
        id: objectiveIds,
      },
      individualHooks: true,
      force: true,
    });

    await ActivityReportGoal.destroy({
      where: {
        id: activityReportGoalIds,
      },
      individualHooks: true,
    });

    await Goal.destroy({
      where: {
        id: possibleGoalIds,
      },
      individualHooks: true,
      force: true,
    });

    await Promise.all(
      [emptyReport, reportWithReasons, reportWithTopics]
        .map(async (report) => destroyReport(report)),
    );

    await Grant.destroy({
      where: {
        id: [grant.id, otherGrant.id, topicsGrant.id, reasonsGrant.id],
      },
      individualHooks: true,
    });

    await Recipient.destroy({
      where: {
        id: [grant.recipientId, topicsGrant.recipientId, reasonsGrant.recipientId],
      },
      individualHooks: true,
    });

    await db.sequelize.close();
  });

  describe('groups', () => {
    let group;
    let grantForGroups;
    let goalForGroups;

    const userName = faker.datatype.string(100);

    const mockUser = {
      id: faker.datatype.number(),
      homeRegionId: REGION_ID,
      name: userName,
      hsesUsername: userName,
      hsesUserId: userName,
    };

    beforeAll(async () => {
      grantForGroups = await createGrant({
        regionId: REGION_ID, number: faker.datatype.string(100),
      });
      await User.create(mockUser);

      group = await Group.create({
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        userId: mockUser.id,
        isPublic: false,
      });

      await GroupCollaborator.create({
        groupId: group.id,
        userId: mockUser.id,
        collaboratorTypeId: 1,
      });

      await GroupGrant.create({
        groupId: group.id,
        grantId: grantForGroups.id,
      });

      goalForGroups = await createGoal({
        grantId: grantForGroups.id,
        status: 'Not Started',
      });
    });

    afterAll(async () => {
      await Goal.destroy({
        where: {
          id: goalForGroups.id,
        },
        individualHooks: true,
        force: true,
      });

      await GroupGrant.destroy({
        where: {
          groupId: group.id,
        },
        individualHooks: true,
      });

      await GroupCollaborator.destroy({
        where: {
          groupId: group.id,
        },
        individualHooks: true,
      });

      await Group.destroy({
        where: {
          id: group.id,
        },
        individualHooks: true,
      });

      await Grant.destroy({
        where: {
          id: grantForGroups.id,
        },
        individualHooks: true,
      });

      await User.destroy({
        where: {
          id: mockUser.id,
        },
        individualHooks: true,
      });
    });

    it('within', async () => {
      const filters = { 'group.in': group.id };
      const { goal: scope } = await filtersToScopes(filters, { userId: mockUser.id });
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: [...possibleGoalIds, goalForGroups.id],
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain(goalForGroups.name);
    });

    it('without', async () => {
      const filters = { 'group.nin': group.id };
      const { goal: scope } = await filtersToScopes(filters, { userId: mockUser.id });
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: [...possibleGoalIds, goalForGroups.id],
            },
          ],
        },
      });

      expect(found.length).toBe(possibleGoalIds.length);
      expect(found.map((g) => g.id)).not.toContain(goalForGroups.id);
    });
  });

  describe('createDate', () => {
    it('before', async () => {
      const filters = { 'createDate.bef': '2021/01/09' };
      const { goal: scope } = await filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(4);
      expect(found.map((g) => g.name)).toContain('Goal 1');
      expect(found.map((g) => g.name)).toContain('Goal 2');
      expect(found.map((g) => g.name)).toContain('Goal 3');
      expect(found.map((g) => g.name)).toContain('Goal 4');
    });

    it('after', async () => {
      const filters = { 'createDate.aft': '2021/01/09' };
      const { goal: scope } = await filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(3);
      expect(found.map((g) => g.name)).toContain('Goal 5');
    });

    it('within', async () => {
      const filters = { 'createDate.win': '2021/01/09-2021/01/11' };
      const { goal: scope } = await filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 5');
    });
  });

  describe('status', () => {
    it('filters in by status', async () => {
      const filters = { 'status.in': ['In Progress', 'Needs status'] };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(3);
      expect(found.map((g) => g.name)).toContain('Goal 1');
      expect(found.map((g) => g.name)).toContain('Goal 3');
      expect(found.map((g) => g.name)).toContain('Goal 4');
    });
    it('filters out by status', async () => {
      const filters = { 'status.nin': ['Suspended'] };
      const { goal: scope } = await filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(5);
      expect(found.map((g) => g.name)).toContain('Goal 1');
      expect(found.map((g) => g.name)).toContain('Goal 2');
      expect(found.map((g) => g.name)).toContain('Goal 3');
      expect(found.map((g) => g.name)).toContain('Goal 4');
    });
  });

  describe('reasons', () => {
    it('filters by reason', async () => {
      const filters = { 'reason.in': 'Full Enrollment' };
      const { goal: scope } = await filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 1');
    });
    it('filters by reason with recipient', async () => {
      const filters = { 'reason.in': 'Full Enrollment' };
      const { goal: scope } = await filtersToScopes(
        filters,
        {
          goal: {
            recipientId: reasonsGrant.recipientId,
          },
        },
      );
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 1');
    });
    it('filters out by reason', async () => {
      const filters = { 'reason.nin': 'Full Enrollment' };
      const { goal: scope } = await filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleGoalIds },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found.map((g) => g.name)).not.toContain('Goal 1');
    });
    it('filters out by reason with recipient', async () => {
      const filters = { 'reason.nin': 'Full Enrollment' };
      const { goal: scope } = await filtersToScopes(
        filters,
        {
          goal: {
            recipientId: reasonsGrant.recipientId,
          },
        },
      );
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            { id: possibleGoalIds },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found.map((g) => g.name)).not.toContain('Goal 1');
    });
  });

  describe('topics', () => {
    it('filters in by topics', async () => {
      const filters = { 'topic.in': 'Behavioral / Mental Health / Trauma' };
      const { goal: scope } = await filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 2');
    });

    it('filters in by topics and recipient', async () => {
      const filters = { 'topic.in': 'Behavioral / Mental Health / Trauma' };
      const { goal: scope } = await filtersToScopes(
        filters,
        {
          goal: {
            recipientId: topicsGrant.recipientId,
          },
        },
      );
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found.map((g) => g.name)).toContain('Goal 2');
    });

    it('filters out by topics', async () => {
      const filters = { 'topic.nin': 'Behavioral / Mental Health / Trauma' };
      const { goal: scope } = await filtersToScopes(filters);
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found.map((g) => g.name)).not.toContain('Goal 2');
    });

    it('filters out by topics and recipient', async () => {
      const filters = { 'topic.nin': 'Behavioral / Mental Health / Trauma' };
      const { goal: scope } = await filtersToScopes(filters, {
        goal: {
          recipientId: topicsGrant.recipientId,
        },
      });
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found.map((g) => g.name)).not.toContain('Goal 2');
    });
  });

  describe('recipientId', () => {
    it('filters by recipientId', async () => {
      const filters = { 'recipientId.ctn': [grant.recipientId] };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found[0].name).toContain('Goal 6');
    });
  });

  describe('region', () => {
    it('filters by region', async () => {
      const filters = { 'region.in': [grant.regionId] };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found.map((f) => f.name)).toContain('Goal 1');
    });

    it('filters out by region', async () => {
      const filters = { 'region.nin': [grant.regionId] };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found[0].name).not.toContain('Goal 6');
    });
  });

  describe('grant number', () => {
    it('withGrantNumber', async () => {
      const filters = { 'grantNumber.in': otherGrant.number };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(1);
      expect(found[0].name).toContain('Goal 7');
    });

    it('withoutGrantNumber', async () => {
      const filters = { 'grantNumber.nin': otherGrant.number };
      const { goal: scope } = await filtersToScopes(filters, 'goal');
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: possibleGoalIds,
            },
          ],
        },
      });

      expect(found.length).toBe(6);
      expect(found[0].name).not.toContain('Goal 7');
    });
  });

  describe('goalType', () => {
    describe('withGoalType', () => {
      it('RTTAPA', async () => {
        const filters = { 'goalType.in': 'RTTAPA' };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: possibleGoalIds,
              },
            ],
          },
        });

        expect(found.length).toBe(2);
        const names = found.map((f) => f.name);
        expect(names).toContain('Goal 1');
        expect(names).toContain('Goal 2');
      });
      it('no', async () => {
        const filters = { 'goalType.in': 'Non-RTTAPA' };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: possibleGoalIds,
              },
            ],
          },
        });

        expect(found.length).toBe(2);
        const names = found.map((f) => f.name);
        expect(names).toContain('Goal 3');
        expect(names).toContain('Goal 4');
      });

      it('other', async () => {
        const filters = { 'goalType.in': 'false' };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: possibleGoalIds,
              },
            ],
          },
        });

        expect(possibleGoalIds.length).toBe(7);
        expect(found.length).toBe(7);
      });
    });

    describe('withoutRttapa', () => {
      it('yes', async () => {
        const filters = { 'goalType.nin': 'RTTAPA' };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: possibleGoalIds,
              },
            ],
          },
        });

        expect(found.length).toBe(5);
        const names = found.map((f) => f.name);
        expect(names).not.toContain('Goal 1');
        expect(names).not.toContain('Goal 2');
      });
      it('no', async () => {
        const filters = { 'goalType.nin': 'Non-RTTAPA' };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: possibleGoalIds,
              },
            ],
          },
        });

        expect(found.length).toBe(5);
        const names = found.map((f) => f.name);
        expect(names).not.toContain('Goal 3');
        expect(names).not.toContain('Goal 4');
      });

      it('other', async () => {
        const filters = { 'goalType.nin': 'false' };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: possibleGoalIds,
              },
            ],
          },
        });

        expect(possibleGoalIds.length).toBe(7);
        expect(found.length).toBe(7);
      });
    });
  });

  describe('resourceUrl', () => {
    let reportToInclude;
    let reportToExclude;

    let goalToInclude;
    let goalToExclude;

    const arResourceUrl = faker.internet.url();
    const argResourceUrl = faker.internet.url();
    const aroResourceUrl = faker.internet.url();
    const nsResourceUrl = faker.internet.url();

    let reports = [];
    let goals = [];
    let goalIds = [];
    let resources = [];

    beforeAll(async () => {
      reportToInclude = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });

      goalToInclude = await createGoal({
        status: 'Closed',
      });

      const argToInclude = await ActivityReportGoal.create({
        activityReportId: reportToInclude.id,
        goalId: goalToInclude.id,
        name: goalToInclude.name,
        status: goalToInclude.status,
        endDate: null,
      });

      const arResource = await Resource.create({
        url: arResourceUrl,
      });

      const argResource = await Resource.create({
        url: argResourceUrl,
      });

      const aroResource = await Resource.create({
        url: aroResourceUrl,
      });

      const nsResource = await Resource.create({
        url: nsResourceUrl,
      });

      await ActivityReportResource.create({
        activityReportId: reportToInclude.id,
        resourceId: arResource.id,
      });

      await ActivityReportGoalResource.create({
        activityReportGoalId: argToInclude.id,
        resourceId: argResource.id,
      });

      const objectiveToInclude = await Objective.create({
        title: faker.lorem.paragraph(),
        goalId: goalToInclude.id,
        ttaProvided: '',
      });

      const aroToInclude = await ActivityReportObjective.create({
        activityReportId: reportToInclude.id,
        objectiveId: objectiveToInclude.id,
      });

      await ActivityReportObjectiveResource.create({
        activityReportObjectiveId: aroToInclude.id,
        resourceId: aroResource.id,
      });

      const nsToInclude = await NextStep.create({
        activityReportId: reportToInclude.id,
        note: faker.lorem.sentence(),
        noteType: 'RECIPIENT',
      });

      await NextStepResource.create({
        nextStepId: nsToInclude.id,
        resourceId: nsResource.id,
      });

      reportToExclude = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });

      goalToExclude = await createGoal({
        status: 'Closed',
      });

      const argToExclude = await ActivityReportGoal.create({
        activityReportId: reportToExclude.id,
        goalId: goalToExclude.id,
        name: goalToExclude.name,
        status: goalToExclude.status,
        endDate: null,
      });

      const arResourceExcluded = await Resource.create({
        url: faker.internet.url(),
      });

      const argResourceExcluded = await Resource.create({
        url: faker.internet.url(),
      });

      const aroResourceExcluded = await Resource.create({
        url: faker.internet.url(),
      });

      const nsResourceExcluded = await Resource.create({
        url: faker.internet.url(),
      });

      await ActivityReportResource.create({
        activityReportId: reportToExclude.id,
        resourceId: arResourceExcluded.id,
      });

      await ActivityReportGoalResource.create({
        activityReportGoalId: argToExclude.id,
        resourceId: argResourceExcluded.id,
      });

      const objectiveToExclude = await Objective.create({
        title: faker.lorem.paragraph(),
        goalId: goalToExclude.id,
        ttaProvided: '',
      });

      const aroToExclude = await ActivityReportObjective.create({
        activityReportId: reportToExclude.id,
        objectiveId: objectiveToExclude.id,
      });

      await ActivityReportObjectiveResource.create({
        activityReportObjectiveId: aroToExclude.id,
        resourceId: aroResourceExcluded.id,
      });

      const nsToExclude = await NextStep.create({
        activityReportId: reportToExclude.id,
        note: faker.lorem.sentence(),
        noteType: 'RECIPIENT',
      });

      await NextStepResource.create({
        nextStepId: nsToExclude.id,
        resourceId: nsResourceExcluded.id,
      });

      reports = [
        reportToInclude,
        reportToExclude,
      ];

      goals = [
        goalToInclude,
        goalToExclude,
      ];

      goalIds = goals.map((goal) => goal.id);

      resources = [
        arResource,
        argResource,
        aroResource,
        nsResource,
        arResourceExcluded,
        argResourceExcluded,
        aroResourceExcluded,
        nsResourceExcluded,
      ];
    });

    afterAll(async () => {
      await ActivityReportResource.destroy({
        where: {
          resourceId: resources.map((r) => r.id),
        },
      });

      await ActivityReportGoalResource.create({
        where: {
          resourceId: resources.map((r) => r.id),
        },
      });

      await ActivityReportObjectiveResource.create({
        where: {
          resourceId: resources.map((r) => r.id),
        },
      });

      await NextStepResource.destroy({
        where: {
          resourceId: resources.map((r) => r.id),
        },
      });

      await Resource.destroy({
        where: {
          id: resources.map((r) => r.id),
        },
      });

      const o = await Objective.findAll({
        where: {
          goalId: goals.map((g) => g.id),
        },
      });

      await ActivityReportObjective.destroy({
        where: {
          objectiveId: o.map((ob) => ob.id),
        },
        individualHooks: true,
      });

      await Objective.destroy({
        where: {
          id: o.map((ob) => ob.id),
        },
        individualHooks: true,
        force: true,
      });

      await ActivityReportGoal.destroy({
        where: {
          goalId: goals.map((g) => g.id),
        },
        individualHooks: true,
      });

      await Goal.destroy({
        where: {
          id: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      });

      await NextStep.destroy({
        where: {
          activityReportId: reports.map((r) => r.id),
        },
        individualHooks: true,
      });

      await Promise.all(reports.map((r) => (
        destroyReport(r)
      )));
    });

    describe('ar resource', () => {
      it('in', async () => {
        const filters = { 'resourceUrl.ctn': arResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(goalToInclude.id);
      });
      it('not in', async () => {
        const filters = { 'resourceUrl.nctn': arResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).not.toEqual(goalToInclude.id);
      });
    });

    describe('arg resource', () => {
      it('in', async () => {
        const filters = { 'resourceUrl.ctn': argResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(goalToInclude.id);
      });
      it('not in', async () => {
        const filters = { 'resourceUrl.nctn': argResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).not.toEqual(goalToInclude.id);
      });
    });

    describe('aro resource', () => {
      it('in', async () => {
        const filters = { 'resourceUrl.ctn': aroResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(goalToInclude.id);
      });
      it('not in', async () => {
        const filters = { 'resourceUrl.nctn': aroResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).not.toEqual(goalToInclude.id);
      });
    });
    describe('ns resource', () => {
      it('in', async () => {
        const filters = { 'resourceUrl.ctn': nsResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(goalToInclude.id);
      });
      it('not in', async () => {
        const filters = { 'resourceUrl.nctn': nsResourceUrl };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).not.toEqual(goalToInclude.id);
      });
    });
  });

  describe('resourceAttachment', () => {
    let reportToInclude;
    let reportToExclude;

    let goalToInclude;
    let goalToExclude;

    const arResourceFilename = faker.system.fileName();
    const aroResourceFilename = faker.system.fileName();

    const arResourceFilenameExcluded = faker.system.fileName();
    const aroResourceFilenameExcluded = faker.system.fileName();

    let reports = [];
    let goals = [];
    let goalIds = [];
    let resources = [];

    beforeAll(async () => {
      reportToInclude = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });

      goalToInclude = await createGoal({
        status: 'Closed',
      });

      await ActivityReportGoal.create({
        activityReportId: reportToInclude.id,
        goalId: goalToInclude.id,
        name: goalToInclude.name,
        status: goalToInclude.status,
        endDate: null,
      });

      const arResource = await File.create({
        originalFileName: arResourceFilename,
        key: faker.word.preposition() + faker.word.adjective(),
        status: 'APPROVED',
        fileSize: 1000,
      });

      const aroResource = await File.create({
        originalFileName: aroResourceFilename,
        key: faker.word.preposition() + faker.word.adjective(),
        status: 'APPROVED',
        fileSize: 1000,
      });

      await ActivityReportFile.create({
        activityReportId: reportToInclude.id,
        fileId: arResource.id,
      });

      const objectiveToInclude = await Objective.create({
        title: faker.lorem.paragraph(),
        goalId: goalToInclude.id,
        ttaProvided: '',
      });

      const aroToInclude = await ActivityReportObjective.create({
        activityReportId: reportToInclude.id,
        objectiveId: objectiveToInclude.id,
      });

      await ActivityReportObjectiveFile.create({
        activityReportObjectiveId: aroToInclude.id,
        fileId: aroResource.id,
      });

      reportToExclude = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });

      goalToExclude = await createGoal({
        status: 'Closed',
      });

      await ActivityReportGoal.create({
        activityReportId: reportToExclude.id,
        goalId: goalToExclude.id,
        name: goalToExclude.name,
        status: goalToExclude.status,
        endDate: null,
      });

      const arResourceExcluded = await File.create({
        originalFileName: arResourceFilenameExcluded,
        key: faker.word.preposition() + faker.word.adjective(),
        status: 'APPROVED',
        fileSize: 1000,
      });

      const aroResourceExcluded = await File.create({
        originalFileName: aroResourceFilenameExcluded,
        key: faker.word.preposition() + faker.word.adjective(),
        status: 'APPROVED',
        fileSize: 1000,
      });
      await ActivityReportFile.create({
        activityReportId: reportToExclude.id,
        fileId: arResourceExcluded.id,
      });

      const objectiveToExclude = await Objective.create({
        title: faker.lorem.paragraph(),
        goalId: goalToExclude.id,
        ttaProvided: '',
      });

      const aroToExclude = await ActivityReportObjective.create({
        activityReportId: reportToExclude.id,
        objectiveId: objectiveToExclude.id,
      });

      await ActivityReportObjectiveFile.create({
        activityReportObjectiveId: aroToExclude.id,
        fileId: aroResourceExcluded.id,
      });

      reports = [
        reportToInclude,
        reportToExclude,
      ];

      goals = [
        goalToInclude,
        goalToExclude,
      ];

      goalIds = goals.map((goal) => goal.id);

      resources = [
        arResource,
        aroResource,
        arResourceExcluded,
        aroResourceExcluded,
      ];
    });

    afterAll(async () => {
      await ActivityReportFile.destroy({
        where: {
          fileId: resources.map((r) => r.id),
        },
      });

      await ActivityReportObjectiveFile.create({
        where: {
          fileId: resources.map((r) => r.id),
        },
      });

      await File.destroy({
        where: {
          id: resources.map((r) => r.id),
        },
      });

      const o = await Objective.findAll({
        where: {
          goalId: goals.map((g) => g.id),
        },
      });

      await ActivityReportObjective.destroy({
        where: {
          objectiveId: o.map((ob) => ob.id),
        },
        individualHooks: true,
      });

      await Objective.destroy({
        where: {
          id: o.map((ob) => ob.id),
        },
        individualHooks: true,
        force: true,
      });

      await ActivityReportGoal.destroy({
        where: {
          goalId: goals.map((g) => g.id),
        },
        individualHooks: true,
      });

      await Goal.destroy({
        where: {
          id: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      });

      await Promise.all(reports.map((r) => (
        destroyReport(r)
      )));
    });

    describe('ar resource', () => {
      it('in', async () => {
        const filters = { 'resourceAttachment.ctn': arResourceFilename };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(goalToInclude.id);
      });
      it('not in', async () => {
        const filters = { 'resourceAttachment.nctn': arResourceFilename };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).not.toEqual(goalToInclude.id);
      });
    });

    describe('aro resource', () => {
      it('in', async () => {
        const filters = { 'resourceAttachment.ctn': aroResourceFilename };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(goalToInclude.id);
      });
      it('not in', async () => {
        const filters = { 'resourceAttachment.nctn': aroResourceFilename };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).not.toEqual(goalToInclude.id);
      });
    });
  });

  describe('reportText', () => {
    const nextStepsNote = faker.lorem.sentence();
    let nextStepsGoal;
    let nextStepsReport;

    const argName = faker.lorem.sentence();
    let argNameGoal;
    let argNameReport;

    const objectiveTitle = faker.lorem.sentence();
    let objectiveTitleGoal;
    let objectiveTitleReport;

    const objectiveTTAProvided = faker.lorem.sentence();
    let objectiveTTAProvidedGoal;
    let objectiveTTAProvidedReport;

    const arContext = faker.lorem.sentence();
    let arContextGoal;
    let arContextReport;

    const arAdditionalNotes = faker.lorem.sentence();
    let arAdditionalNotesGoal;
    let arAdditionalNotesReport;

    let reports = [];
    let goals = [];
    let goalIds = [];

    beforeAll(async () => {
      nextStepsReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });
      await NextStep.create({
        activityReportId: nextStepsReport.id,
        note: nextStepsNote,
        noteType: 'RECIPIENT',
      });

      nextStepsGoal = await createGoal({
        status: 'Closed',
      });

      await ActivityReportGoal.create({
        activityReportId: nextStepsReport.id,
        goalId: nextStepsGoal.id,
        name: nextStepsGoal.name,
        status: nextStepsGoal.status,
        endDate: null,
      });

      argNameReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });
      argNameGoal = await createGoal({
        name: argName,
        status: 'Closed',
      });
      await ActivityReportGoal.create({
        activityReportId: argNameReport.id,
        goalId: argNameGoal.id,
        name: argNameGoal.name,
        status: argNameGoal.status,
        endDate: null,
      });

      objectiveTitleReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });
      objectiveTitleGoal = await createGoal({
        status: 'In Progress',
      });
      const objectiveTitleObjective = await Objective.create({
        title: objectiveTitle,
        goalId: objectiveTitleGoal.id,
        ttaProvided: '',
      });
      await ActivityReportGoal.create({
        activityReportId: objectiveTitleReport.id,
        goalId: objectiveTitleGoal.id,
        name: objectiveTitleGoal.name,
        status: objectiveTitleGoal.status,
        endDate: null,
      });
      await ActivityReportObjective.create({
        activityReportId: objectiveTitleReport.id,
        objectiveId: objectiveTitleObjective.id,
        ttaProvided: '',
        title: objectiveTitleObjective.title,
      });

      objectiveTTAProvidedReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
      });
      objectiveTTAProvidedGoal = await createGoal({
        status: 'In Progress',
      });
      const objectiveTTAObjective = await Objective.create({
        title: faker.lorem.sentence(),
        goalId: objectiveTTAProvidedGoal.id,
        ttaProvided: objectiveTTAProvided,
      });
      await ActivityReportGoal.create({
        activityReportId: objectiveTTAProvidedReport.id,
        goalId: objectiveTTAProvidedGoal.id,
        name: objectiveTTAProvidedGoal.name,
        status: objectiveTTAProvidedGoal.status,
        endDate: null,
      });
      await ActivityReportObjective.create({
        activityReportId: objectiveTTAProvidedReport.id,
        objectiveId: objectiveTTAObjective.id,
        ttaProvided: objectiveTTAProvided,
        title: objectiveTTAObjective.title,
      });
      arContextReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
        context: arContext,
      });

      arContextGoal = await createGoal({
        status: 'Not Started',
      });

      await ActivityReportGoal.create({
        activityReportId: arContextReport.id,
        goalId: arContextGoal.id,
      });

      arAdditionalNotesReport = await createReport({
        activityRecipients: [
          {
            grantId: faker.datatype.number(),
          },
        ],
        additionalNotes: arAdditionalNotes,
      });

      arAdditionalNotesGoal = await createGoal({
        status: 'In Progress',
      });

      await ActivityReportGoal.create({
        activityReportId: arAdditionalNotesReport.id,
        goalId: arAdditionalNotesGoal.id,
      });

      reports = [
        nextStepsReport,
        argNameReport,
        objectiveTitleReport,
        objectiveTTAProvidedReport,
        arContextReport,
        arAdditionalNotesReport,
      ];

      goals = [
        nextStepsGoal,
        argNameGoal,
        objectiveTitleGoal,
        objectiveTTAProvidedGoal,
        arContextGoal,
        arAdditionalNotesGoal,
      ];

      goalIds = goals.map((goal) => goal.id);
    });

    afterAll(async () => {
      const o = await Objective.findAll({
        where: {
          goalId: goals.map((g) => g.id),
        },
      });

      await ActivityReportObjective.destroy({
        where: {
          objectiveId: o.map((ob) => ob.id),
        },
        individualHooks: true,
      });

      await Objective.destroy({
        where: {
          id: o.map((ob) => ob.id),
        },
        individualHooks: true,
        force: true,
      });

      await ActivityReportGoal.destroy({
        where: {
          goalId: goals.map((g) => g.id),
        },
        individualHooks: true,
      });

      await Goal.destroy({
        where: {
          id: goals.map((g) => g.id),
        },
        individualHooks: true,
        force: true,
      });

      await NextStep.destroy({
        where: {
          activityReportId: reports.map((r) => r.id),
        },
        individualHooks: true,
      });

      await Promise.all(reports.map((r) => (
        destroyReport(r)
      )));
    });

    describe('next steps', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': nextStepsNote };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(nextStepsGoal.id);
      });
      it('not in', async () => {
        const filters = { 'reportText.nctn': nextStepsNote };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(goalIds.length - 1);
        expect(found.map((g) => g.id)).not.toContain(nextStepsGoal.id);
      });
    });

    describe('goal name', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': argName };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(argNameGoal.id);
      });
      it('not in', async () => {
        const filters = { 'reportText.nctn': argName };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(goalIds.length - 1);
        expect(found.map((g) => g.id)).not.toContain(argNameGoal.id);
      });
    });

    describe('objective title', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': objectiveTitle };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(objectiveTitleGoal.id);
      });
      it('not in', async () => {
        const filters = { 'reportText.nctn': objectiveTitle };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(goalIds.length - 1);
        expect(found.map((g) => g.id)).not.toContain(objectiveTitleGoal.id);
      });
    });

    describe('objective TTA provided', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': objectiveTTAProvided };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(objectiveTTAProvidedGoal.id);
      });
      it('not in', async () => {
        const filters = { 'reportText.nctn': objectiveTTAProvided };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: {
            [Op.and]: [
              scope,
              {
                id: goalIds,
              },
            ],
          },
        });

        expect(found.length).toEqual(goalIds.length - 1);
        expect(found.map((g) => g.id)).not.toContain(objectiveTTAProvidedGoal.id);
      });
    });
    describe('ar context', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': arContext };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: { [Op.and]: [scope, { id: goalIds }] },
        });
        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(arContextGoal.id);
      });
      it('not in', async () => {
        const filters = { 'reportText.nctn': arContext };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: { [Op.and]: [scope, { id: goalIds }] },
        });
        expect(found.map((g) => g.id)).not.toContain(arContextGoal.id);
        expect(found.length).toEqual(goalIds.length - 1);
      });
    });

    describe('ar additional notes', () => {
      it('in', async () => {
        const filters = { 'reportText.ctn': arAdditionalNotes };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: { [Op.and]: [scope, { id: goalIds }] },
        });
        expect(found.length).toEqual(1);
        expect(found[0].id).toEqual(arAdditionalNotesGoal.id);
      });
      it('not in', async () => {
        const filters = { 'reportText.nctn': arAdditionalNotes };
        const { goal: scope } = await filtersToScopes(filters, 'goal');
        const found = await Goal.findAll({
          where: { [Op.and]: [scope, { id: goalIds }] },
        });
        expect(found.map((g) => g.id)).not.toContain(arAdditionalNotesGoal.id);
        expect(found.length).toEqual(goalIds.length - 1);
      });
    });
  });
});
