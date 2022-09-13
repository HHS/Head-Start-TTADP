import waitFor from 'wait-for-expect';
import db, {
  ActivityRecipient,
  ActivityReport,
  User,
  Objective,
  ActivityReportObjective,
  sequelize,
  Grant,
  Goal,
  Recipient,
  OtherEntity,
} from '../models';
import { REPORT_STATUSES } from '../constants';

import { saveObjectivesForReport, getObjectiveById, getObjectivesByReportId } from './objectives';

const mockUser = {
  id: 8088,
  homeRegionId: 1,
  name: 'user8000',
  hsesUsername: 'user8000',
  hsesUserId: '8000',
};

const reportObject = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  lastUpdatedById: mockUser.id,
};

const mockGrant = {
  id: 43259435,
  number: '99CH3499',
  regionId: 2,
  status: 'Active',
  startDate: new Date('2022-07-19T15:13:00.000Z'),
  endDate: new Date('2022-07-19T15:13:00.000Z'),
  cdi: false,
  grantSpecialistName: null,
  grantSpecialistEmail: null,
  stateCode: 'NY',
  anualFundingMonth: 'October',
};

const mockRecipient = {
  id: 654925,
  name: 'Sample Obj File Recipient',
  recipientType: 'Community Action Agency (CAA)',
};

const mockOtherEntity = {
  name: 'Mock Other Entity for OE Objectives',
};

describe('Objectives DB service', () => {
  let report;
  let objective;

  let secondObjective;

  let objectiveInfo;
  let grantInfo;
  let recipientInfo;
  let goalInfo;

  let otherEntity;

  let findObjectiveById;
  let findObjectiveByTitle;

  const objectives = [
    {
      id: 'uuid',
      title: 'first objective',
      ttaProvided: 'tta first',
      status: 'In Progress',
      isNew: true,
      recipientIds: [1],
      ids: ['uuid'],
      roles: [],
      topics: [],
      resources: [],
      files: [],
    },
    {
      id: 'uuid2',
      title: 'second objective',
      ttaProvided: 'tta second',
      status: 'In Progress',
      isNew: true,
      recipientIds: [1],
      ids: ['uuid2'],
      roles: [],
      topics: [],
      resources: [],
      files: [],
    },
  ];

  beforeAll(async () => {
    await User.create(mockUser);
    report = await ActivityReport.create(reportObject);
    objective = await Objective.create({
      title: 'title',
      ttaProvided: 'tta provided',
      status: 'Draft',
      otherEntityId: 1,
    });

    secondObjective = await Objective.create({
      title: 'second title',
      status: 'Draft',
      otherEntityId: 1,
    });

    await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: report.id,
      ttaProvided: 'tta provided',
      status: objective.status,
    });

    await ActivityReportObjective.create({
      objectiveId: secondObjective.id,
      activityReportId: report.id,
      status: secondObjective.status,
    });

    await sequelize.transaction(async () => {
      await saveObjectivesForReport([...objectives, {
        id: objective.id,
        title: objective.title,
        ttaProvided: 'tta provided',
        status: objective.status,
        recipientIds: [1],
        ids: [objective.id],
        roles: [],
      }], report);
    });
    otherEntity = await OtherEntity.create({ ...mockOtherEntity, id: 685497 });
    recipientInfo = await Recipient.create({ ...mockRecipient });
    grantInfo = await Grant.create({ ...mockGrant, recipientId: recipientInfo.id });
    goalInfo = await Goal.create({ name: 'sample goal for obj info', grantId: grantInfo.id });
    objectiveInfo = await Objective.create({ title: 'sample obj for info', goalId: goalInfo.id });
    findObjectiveById = await Objective.create({
      id: 598742,
      title: 'i already exist with an id',
      status: 'In Progress',
      otherEntityId: 1,
    });
    findObjectiveByTitle = await Objective.create({
      id: 594743,
      title: 'there are many titles but this one is mine',
      status: 'In Progress',
      otherEntityId: 1,
    });
  });

  afterAll(async () => {
    const aros = await ActivityReportObjective.findAll({ where: { activityReportId: report.id } });
    const objectiveIds = aros.map((aro) => aro.objectiveId);
    await ActivityReportObjective.destroy({ where: { activityReportId: report.id } });
    await Objective.destroy({
      where: {
        id:
      [...objectiveIds,
        objective.id,
        secondObjective.id,
        findObjectiveById.id,
        findObjectiveByTitle.id],
      },
    });
    await ActivityRecipient.destroy({ where: { activityReportId: report.id } });
    await ActivityReport.destroy({ where: { id: report.id } });

    await Objective.destroy({ where: { id: objectiveInfo.id } });
    await Goal.destroy({ where: { id: goalInfo.id } });
    await Grant.destroy({ where: { id: grantInfo.id } });
    await Recipient.destroy({ where: { id: recipientInfo.id } });
    await OtherEntity.destroy({ where: { id: otherEntity.id } });
    await User.destroy({ where: { id: mockUser.id } });
    await db.sequelize.close();
  });

  describe('saveObjectivesForReport', () => {
    it('gets objective by id', async () => {
      const foundObj = await getObjectiveById(objectiveInfo.id);
      expect(foundObj).not.toBeNull();
      expect(foundObj.goal.grant.regionId).toBe(2);
    });
    it('gets objectives by report id', async () => {
      const reportObjectives = await getObjectivesByReportId(report.id);
      expect(reportObjectives).not.toBeNull();
      expect(reportObjectives.length).toBe(3);
    });
    it('deletes old objectives', async () => {
      waitFor(async () => {
        const found = await Objective.findOne({
          where: { id: secondObjective.id, title: secondObjective.title },
        });
        expect(found).toBeNull();
      });
    });

    it('deletes old activity report objectives', async () => {
      const found = await ActivityReportObjective.findOne({
        where: {
          objectiveId: secondObjective.id,
          activityReportId: report.id,
        },
      });
      expect(found).toBeNull();
    });

    it('creates new objectives and activityReportObjectives', async () => {
      const foundReport = await ActivityReport.findOne({
        where: {
          id: report.id,
        },
        include: [{
          model: Objective,
          as: 'objectivesWithoutGoals',
        }],
      });
      const objs = foundReport.objectivesWithoutGoals;
      expect(objs.length).toBe(3);
      expect(objs.map((o) => o.title).sort())
        .toEqual([objective, ...objectives].map((o) => o.title).sort());
    });
    it('finds existing objective by id', async () => {
      expect(findObjectiveById).not.toBeNull();

      await sequelize.transaction(async () => {
        await saveObjectivesForReport([{
          ...findObjectiveById,
          ids: [findObjectiveById.id],
          recipientIds: [1],
          otherEntityId: 1,
          status: 'In Progress',
          title: 'i have a new title but same id',
          roles: [],
        }], report);
      });
      const foundObj = await getObjectiveById(findObjectiveById.id);
      expect(foundObj.title).toBe('i have a new title but same id');
    });

    it('finds existing objective by title and entity', async () => {
      expect(findObjectiveByTitle).not.toBeNull();

      await sequelize.transaction(async () => {
        await saveObjectivesForReport([{
          ...findObjectiveByTitle,
          recipientIds: [1],
          otherEntityId: 1,
          status: 'Not Started',
          title: 'there are many titles but this one is mine',
          roles: [],
        }], report);
      });
      const foundObj = await getObjectiveById(findObjectiveByTitle.id);
      expect(foundObj.title).toBe('there are many titles but this one is mine');
      expect(foundObj.status).toBe('Not Started');
    });
  });
});
