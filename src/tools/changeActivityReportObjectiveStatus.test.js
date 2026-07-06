import { REPORT_STATUSES } from '@ttahub/common';
import { OBJECTIVE_STATUS } from '../constants';
import { ActivityReport, ActivityReportObjective, Objective, sequelize } from '../models';
import changeActivityReportObjectiveStatus from './changeActivityReportObjectiveStatus';

jest.mock('../logger');

const reportObject = {
  activityRecipientType: 'recipient',
  regionId: 1,
  ECLKCResourcesUsed: ['test'],
  submissionStatus: REPORT_STATUSES.APPROVED,
  calculatedStatus: REPORT_STATUSES.APPROVED,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  requester: 'requester',
  targetPopulations: ['pop'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  version: 2,
};

describe('changeActivityReportObjectiveStatus', () => {
  let report;
  let objective;
  let aro;

  afterEach(async () => {
    if (aro) {
      await ActivityReportObjective.destroy({ where: { id: aro.id } });
      aro = null;
    }

    if (objective) {
      await Objective.destroy({ where: { id: objective.id }, force: true });
      objective = null;
    }

    if (report) {
      await ActivityReport.destroy({ where: { id: report.id } });
      report = null;
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('changes activity report objective status to in progress without changing objective status', async () => {
    report = await ActivityReport.create(reportObject);
    objective = await Objective.create({
      title: 'Test objective',
      status: OBJECTIVE_STATUS.NOT_STARTED,
    });
    aro = await ActivityReportObjective.create({
      activityReportId: report.id,
      objectiveId: objective.id,
      status: OBJECTIVE_STATUS.NOT_STARTED,
    });

    await changeActivityReportObjectiveStatus(aro.id.toString(), 'IN_PROGRESS');

    const updatedAro = await ActivityReportObjective.findOne({ where: { id: aro.id } });
    expect(updatedAro.status).toBe(OBJECTIVE_STATUS.IN_PROGRESS);

    const updatedObjective = await Objective.findByPk(objective.id);
    expect(updatedObjective.status).toBe(OBJECTIVE_STATUS.NOT_STARTED);
  });

  it('throws when the activity report objective does not exist', async () => {
    await expect(
      changeActivityReportObjectiveStatus('999999999', OBJECTIVE_STATUS.IN_PROGRESS)
    ).rejects.toThrow('ActivityReportObjective not found');
  });

  it.each(['', '0', '-1', '1,2', 'abc'])('throws on invalid ids: %s', async (id) => {
    await expect(
      changeActivityReportObjectiveStatus(id, OBJECTIVE_STATUS.IN_PROGRESS)
    ).rejects.toThrow('Invalid ActivityReportObjective id');
  });

  it('throws on invalid statuses', async () => {
    await expect(changeActivityReportObjectiveStatus('1', 'bad-status')).rejects.toThrow(
      'Invalid objective status'
    );
  });
});
