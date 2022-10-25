import db, {
  Recipient,
  Goal,
  GoalTemplate,
  Grant,
} from '..';
import {
  autoPopulateOnApprovedAR,
  preventNamChangeWhenOnApprovedAR,
  autoPopulateStatusChangeDates,
  // propagateName,
} from '../hooks/goal';
import { GOAL_STATUS } from '../../constants';

function sleep(milliseconds) {
  const start = new Date().getTime();
  for (let i = 0; i < 1e7; i += 1) {
    if ((new Date().getTime() - start) > milliseconds) {
      break;
    }
  }
}
const mockRecipient = { id: 5001, name: 'Bobs Builders', uei: 'NNA5N2KHMGM2' };
const mockGrant = { id: 6001, number: '1234567890', regionId: 2 };
const mockGoal = { name: 'build a playground' };

describe('Goals', () => {
  describe('Goals', () => {
    let recipient;
    let grant;
    beforeAll(async () => {
      recipient = await Recipient.create({ ...mockRecipient });
      grant = await Grant.create({ ...mockGrant, recipientId: recipient.id });
    });
    afterAll(async () => {
      await Goal.destroy({ where: { grantId: grant.id } });
      await GoalTemplate.destroy({ where: { templateName: mockGoal.name } });
      await Grant.destroy({ where: { id: grant.id } });
      await Recipient.destroy({ where: { id: recipient.id } });
      await db.sequelize.close();
    });
    it('goalNumber', async () => {
      const goal = await Goal.create({ ...mockGoal, grantId: grant.id });
      expect(goal.goalNumber).toEqual(`G-${goal.id}`);
      await Goal.destroy({ where: { id: goal.id } });
    });
  });
  it('autoPopulateOnApprovedAR', async () => {
    let instance = {
    };
    instance.set = (name, value) => { instance[name] = value; };
    let options = { fields: [] };
    autoPopulateOnApprovedAR(null, instance, options);
    expect(instance.onApprovedAR).toEqual(false);

    instance = {
      onApprovedAR: false,
    };
    instance.set = (name, value) => { instance[name] = value; };
    options = { fields: [] };
    autoPopulateOnApprovedAR(null, instance, options);
    expect(instance.onApprovedAR).toEqual(false);

    instance = {
      onApprovedAR: true,
    };
    instance.set = (name, value) => { instance[name] = value; };
    options = { fields: [] };
    autoPopulateOnApprovedAR(null, instance, options);
    expect(instance.onApprovedAR).toEqual(true);
  });
  it('preventNamChangeWhenOnApprovedAR', async () => {
    const errorMsg = 'Goal name change not allowed for goals on approved activity reports.';
    let instance = {
      changed: () => [],
    };
    instance.set = (name, value) => { instance[name] = value; };
    expect(() => preventNamChangeWhenOnApprovedAR(null, instance))
      .not.toThrowError(errorMsg);

    instance = {
      onApprovedAR: false,
      changed: () => [],
    };
    instance.set = (name, value) => { instance[name] = value; };
    expect(() => preventNamChangeWhenOnApprovedAR(null, instance))
      .not.toThrowError(errorMsg);

    instance = {
      onApprovedAR: false,
      changed: () => ['name'],
    };
    instance.set = (name, value) => { instance[name] = value; };
    expect(() => preventNamChangeWhenOnApprovedAR(null, instance))
      .not.toThrowError(errorMsg);

    instance = {
      onApprovedAR: true,
      changed: () => [],
    };
    instance.set = (name, value) => { instance[name] = value; };
    expect(() => preventNamChangeWhenOnApprovedAR(null, instance))
      .not.toThrowError(errorMsg);

    instance = {
      onApprovedAR: true,
      changed: () => ['name'],
    };
    instance.set = (name, value) => { instance[name] = value; };
    expect(() => preventNamChangeWhenOnApprovedAR(null, instance))
      .toThrowError(errorMsg);
  });
  it('autoPopulateStatusChangeDates', async () => {
    let instance = {
      changed: () => [],
    };
    instance.set = (name, value) => { instance[name] = value; };
    let options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect(instance.firstNotStartedAt).toEqual(undefined);
    expect(instance.firstInProgressAt).toEqual(undefined);
    expect(instance.firstSuspendedAt).toEqual(undefined);
    expect(instance.firstClosedAt).toEqual(undefined);
    expect(instance.lastNotStartedAt).toEqual(undefined);
    expect(instance.lastInProgressAt).toEqual(undefined);
    expect(instance.lastSuspendedAt).toEqual(undefined);
    expect(instance.lastClosedAt).toEqual(undefined);

    instance = {
      changed: () => ['status'],
    };
    instance.set = (name, value) => { instance[name] = value; };
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect(instance.firstNotStartedAt).toEqual(undefined);
    expect(instance.firstInProgressAt).toEqual(undefined);
    expect(instance.firstSuspendedAt).toEqual(undefined);
    expect(instance.firstClosedAt).toEqual(undefined);
    expect(instance.lastNotStartedAt).toEqual(undefined);
    expect(instance.lastInProgressAt).toEqual(undefined);
    expect(instance.lastSuspendedAt).toEqual(undefined);
    expect(instance.lastClosedAt).toEqual(undefined);

    instance = {
      status: null,
      changed: () => ['status'],
    };
    instance.set = (name, value) => { instance[name] = value; };
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect(instance.firstNotStartedAt).toEqual(undefined);
    expect(instance.firstInProgressAt).toEqual(undefined);
    expect(instance.firstSuspendedAt).toEqual(undefined);
    expect(instance.firstClosedAt).toEqual(undefined);
    expect(instance.lastNotStartedAt).toEqual(undefined);
    expect(instance.lastInProgressAt).toEqual(undefined);
    expect(instance.lastSuspendedAt).toEqual(undefined);
    expect(instance.lastClosedAt).toEqual(undefined);

    instance = {
      status: '',
      changed: () => ['status'],
    };
    instance.set = (name, value) => { instance[name] = value; };
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect(instance.firstNotStartedAt).toEqual(undefined);
    expect(instance.firstInProgressAt).toEqual(undefined);
    expect(instance.firstSuspendedAt).toEqual(undefined);
    expect(instance.firstClosedAt).toEqual(undefined);
    expect(instance.lastNotStartedAt).toEqual(undefined);
    expect(instance.lastInProgressAt).toEqual(undefined);
    expect(instance.lastSuspendedAt).toEqual(undefined);
    expect(instance.lastClosedAt).toEqual(undefined);

    instance = {
      status: GOAL_STATUS.DRAFT,
      changed: () => ['status'],
    };
    instance.set = (name, value) => { instance[name] = value; };
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect(instance.firstNotStartedAt).toEqual(undefined);
    expect(instance.firstInProgressAt).toEqual(undefined);
    expect(instance.firstSuspendedAt).toEqual(undefined);
    expect(instance.firstClosedAt).toEqual(undefined);
    expect(instance.lastNotStartedAt).toEqual(undefined);
    expect(instance.lastInProgressAt).toEqual(undefined);
    expect(instance.lastSuspendedAt).toEqual(undefined);
    expect(instance.lastClosedAt).toEqual(undefined);

    instance = {
      status: GOAL_STATUS.NOT_STARTED,
      changed: () => ['status'],
    };
    instance.set = (name, value) => { instance[name] = value; };
    options = { fields: [] };
    const ts = (new Date()).getTime();
    autoPopulateStatusChangeDates(null, instance, options);
    expect((Date.parse(instance.firstNotStartedAt)))
      .toBeLessThan(ts);
    expect(instance.firstInProgressAt).toEqual(undefined);
    expect(instance.firstSuspendedAt).toEqual(undefined);
    expect(instance.firstClosedAt).toEqual(undefined);
    expect((Date.parse(instance.lastNotStartedAt)))
      .toBeLessThan(ts);
    expect(instance.lastInProgressAt).toEqual(undefined);
    expect(instance.lastSuspendedAt).toEqual(undefined);
    expect(instance.lastClosedAt).toEqual(undefined);
    expect(instance.lastNotStartedAt).toEqual(instance.firstNotStartedAt);

    await sleep(1000);
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect((Date.parse(instance.firstNotStartedAt)))
      .toBeLessThan((Date.parse(instance.lastNotStartedAt)));

    await sleep(1000);

    instance.status = GOAL_STATUS.IN_PROGRESS;
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect((Date.parse(instance.firstInProgressAt)))
      .toBeGreaterThan((Date.parse(instance.lastNotStartedAt)));
    expect((Date.parse(instance.lastInProgressAt)))
      .toBeGreaterThan((Date.parse(instance.lastNotStartedAt)));
    expect(instance.lastInProgressAt).toEqual(instance.firstInProgressAt);

    await sleep(1000);
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect((Date.parse(instance.lastInProgressAt)))
      .toBeGreaterThan((Date.parse(instance.firstInProgressAt)));

    await sleep(1000);

    instance.status = GOAL_STATUS.SUSPENDED;
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect((Date.parse(instance.firstSuspendedAt)))
      .toBeGreaterThan((Date.parse(instance.lastInProgressAt)));
    expect((Date.parse(instance.lastSuspendedAt)))
      .toBeGreaterThan((Date.parse(instance.lastInProgressAt)));
    expect(instance.lastSuspendedAt).toEqual(instance.firstSuspendedAt);

    await sleep(1000);
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect((Date.parse(instance.lastSuspendedAt)))
      .toBeGreaterThan((Date.parse(instance.firstSuspendedAt)));

    await sleep(1000);

    instance.status = GOAL_STATUS.CLOSED;
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect((Date.parse(instance.firstClosedAt)))
      .toBeGreaterThan((Date.parse(instance.lastSuspendedAt)));
    expect((Date.parse(instance.lastClosedAt)))
      .toBeGreaterThan((Date.parse(instance.lastSuspendedAt)));
    expect(instance.lastClosedAt).toEqual(instance.firstClosedAt);

    await sleep(1000);
    options = { fields: [] };
    autoPopulateStatusChangeDates(null, instance, options);
    expect((Date.parse(instance.lastClosedAt)))
      .toBeGreaterThan((Date.parse(instance.firstClosedAt)));
  });
});
