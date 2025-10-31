/* eslint-disable max-len */
import {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Recipient,
  Grant,
  Goal,
  Objective,
  Topic,
  draftReport,
  faker,
  setupSharedTestData,
  tearDownSharedTestData,
  sharedTestData,
} from './testHelpers';

describe('topic filtersToScopes', () => {
  beforeAll(async () => {
    await setupSharedTestData();
  });

  afterAll(async () => {
    await tearDownSharedTestData();
  });

  describe('topic', () => {
    let includedReport1;
    let includedReport2;
    let excludedReport;

    let recipient;
    let grant;
    let goal;
    let objective;
    let aro1;
    let aro2;
    let topic1;
    let topic2;

    let possibleIds;

    beforeAll(async () => {
      // Reports.
      includedReport1 = await ActivityReport.create({
        ...draftReport,
        topics: ['Topic 1', 'Topic 2'],
      });
      includedReport2 = await ActivityReport.create({
        ...draftReport,
        topics: ['Topic 1', 'Topic 3'],
      });
      excludedReport = await ActivityReport.create({ ...draftReport, topics: ['another topic'] });
      possibleIds = [
        includedReport1.id,
        includedReport2.id,
        excludedReport.id,
        sharedTestData.globallyExcludedReport.id,
      ];

      // Recipient.
      recipient = await Recipient.create({
        id: faker.datatype.number({ min: 64000 }),
        name: faker.random.alphaNumeric(6),
        uei: faker.datatype.string(12),
      });

      // Grant.
      grant = await Grant.create({
        number: recipient.id,
        recipientId: recipient.id,
        programSpecialistName: faker.name.firstName(),
        regionId: 1,
        id: faker.datatype.number({ min: 64000 }),
      });

      // Goal.
      goal = await Goal.create({
        name: 'Topic Goal on activity report',
        status: 'In Progress',
        timeframe: '12 months',
        grantId: grant.id,
        isFromSmartsheetTtaPlan: false,
        id: faker.datatype.number({ min: 64000 }),
      });

      // Objective.
      objective = await Objective.create({
        goalId: goal.id,
        title: 'topic objective test',
        status: 'Not Started',
      });

      // Activity report objective.
      aro1 = await ActivityReportObjective.create({
        activityReportId: includedReport1.id,
        objectiveId: objective.id,
      });

      aro2 = await ActivityReportObjective.create({
        activityReportId: includedReport2.id,
        objectiveId: objective.id,
      });

      // Topic.
      topic1 = await Topic.create({
        name: 'Topic 4',
      });

      topic2 = await Topic.create({
        name: 'Topic 2',
      });

      // ARO topic.
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro1.id,
        topicId: topic1.id,
      });

      // ARO topic.
      await ActivityReportObjectiveTopic.create({
        activityReportObjectiveId: aro2.id,
        topicId: topic2.id,
      });
    });

    afterAll(async () => {
      // Delete aro's.
      await ActivityReportObjectiveTopic.destroy({
        where: { activityReportObjectiveId: [aro1.id, aro2.id] },
      });

      // Delete Topics.
      await Topic.destroy({
        where: { id: [topic1.id, topic2.id] },
        individualHooks: true,
        force: true,
      });

      // Delete aro.
      await ActivityReportObjective.destroy({
        where: { id: aro1.id },
      });

      await ActivityReportObjective.destroy({
        where: { id: aro2.id },
      });

      // Delete objective.
      await Objective.destroy({
        where: {
          id: objective.id,
        },
        force: true,
      });

      // Delete goal.
      await Goal.destroy({
        where: {
          id: goal.id,
        },
        force: true,
      });

      // Delete reports.
      await ActivityReport.destroy({
        where: { id: [includedReport1.id, includedReport2.id, excludedReport.id] },
      });

      // Delete grant.
      await Grant.destroy({
        where: {
          id: grant.id,
        },
        individualHooks: true,
      });

      // Delete recipient.
      await Recipient.destroy({
        where: {
          id: recipient.id,
        },
      });
    });

    it('includes topics with a match', async () => {
      const filters = { 'topic.in': ['Topic 3'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport2.id]));
    });

    it('includes aro topic with a match', async () => {
      const filters = { 'topic.in': ['Topic 4'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id]));
    });

    it('includes aro topic and topic with a match', async () => {
      const filters = { 'topic.in': ['Topic 2'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([includedReport1.id, includedReport2.id]));
    });

    it('excludes topics that do not match', async () => {
      const filters = { 'topic.nin': ['Topic 1'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, sharedTestData.globallyExcludedReport.id]));
    });

    it('excludes aro topics that do not match', async () => {
      const filters = { 'topic.nin': ['Topic 4'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(3);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([
          includedReport2.id,
          excludedReport.id,
          sharedTestData.globallyExcludedReport.id]));
    });

    it('excludes aro topic and topics that do not match', async () => {
      const filters = { 'topic.nin': ['Topic 3', 'Topic 4'] };
      const { activityReport: scope } = await filtersToScopes(filters);
      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([excludedReport.id, sharedTestData.globallyExcludedReport.id]));
    });

    it('excludes invalid topics from filter', async () => {
      const filters = { 'topic.in': ['BAD_TOPIC', 'Topic 3'] };
      const { activityReport: scope } = await filtersToScopes(filters);

      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toEqual(expect.arrayContaining([includedReport2.id]));
    });

    it('returns no reports if all topics are invalid', async () => {
      const filters = { 'topic.in': ['BAD_TOPIC_1', 'BAD_TOPIC_2'] };
      const { activityReport: scope } = await filtersToScopes(filters);

      const found = await ActivityReport.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });

      expect(found.length).toBe(0);
    });
  });
});
