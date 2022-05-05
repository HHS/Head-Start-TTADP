import waitFor from 'wait-for-expect';
import db, {
  ActivityReport, User, Objective, ActivityReportObjective, sequelize,
} from '../models';
import { REPORT_STATUSES } from '../constants';

import { saveObjectivesForReport } from './objectives';

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

describe('Objectives DB service', () => {
  let report;
  let objective;
  let secondObjective;
  const objectives = [
    {
      id: 'uuid',
      title: 'first objective',
      ttaProvided: 'tta first',
      status: 'In Progress',
      new: true,
    },
    {
      id: 'uuid2',
      title: 'second objective',
      ttaProvided: 'tta second',
      status: 'In Progress',
      new: true,
    },
  ];

  beforeAll(async () => {
    await User.create(mockUser);
    report = await ActivityReport.create(reportObject);
    objective = await Objective.create({
      title: 'title',
      ttaProvided: 'tta provided',
      status: 'status',
    });

    secondObjective = await Objective.create({
      title: 'second title',
      ttaProvided: 'tta provided',
      status: 'status',
    });

    await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: report.id,
    });

    await ActivityReportObjective.create({
      objectiveId: secondObjective.id,
      activityReportId: report.id,
    });

    await sequelize.transaction(async () => {
      await saveObjectivesForReport([...objectives, objective], report);
    });
  });

  afterAll(async () => {
    const aros = await ActivityReportObjective.findAll({ where: { activityReportId: report.id } });
    const objectiveIds = aros.map((aro) => aro.objectiveId);
    await ActivityReportObjective.destroy({ where: { activityReportId: report.id } });
    await Objective.destroy({ where: { id: objectiveIds } });
    await ActivityReport.destroy({ where: { id: report.id } });
    await User.destroy({ where: { id: mockUser.id } });
    await db.sequelize.close();
  });

  describe('saveObjectivesForReport', () => {
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
  });
});
