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
  const objectives = [
    {
      id: 'uuid',
      title: 'first objective',
      ttaProvided: 'tta first',
      status: 'In Progress',
    },
    {
      id: 'uuid2',
      title: 'second objective',
      ttaProvided: 'tta second',
      status: 'In Progress',
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

    await ActivityReportObjective.create({
      objectiveId: objective.id,
      activityReportId: report.id,
    });

    await sequelize.transaction(async (transaction) => {
      await saveObjectivesForReport(objectives, report, transaction);
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
      const found = await Objective.findOne({ where: { id: objective.id } });
      expect(found).toBeNull();
    });

    it('deletes old activity report objectives', async () => {
      const found = await ActivityReportObjective.findOne({ where: { id: objective.id } });
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
      expect(objs.length).toBe(2);
      expect(objs.map((o) => o.title)).toEqual(objectives.map((o) => o.title));
    });
  });
});
