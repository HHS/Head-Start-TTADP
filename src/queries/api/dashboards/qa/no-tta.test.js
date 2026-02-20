import fs from 'fs';
import path from 'path';
import { QueryTypes } from 'sequelize';
import db, {
  ActivityReport,
  ActivityRecipient,
  ActivityReportGoal,
  Goal,
  GoalTemplate,
  Grant,
  Program,
  Recipient,
  User,
} from '../../../../models';
import {
  createUser,
  createGoal,
  getUniqueId,
} from '../../../../testUtils';
import { setFilters } from '../../../../services/ssdi';

// Read and strip the JSON header from the SQL file so we can execute it directly
// (avoiding the BASE_DIRECTORY path resolution in executeQuery which points to /app/src/queries/)
const sqlContent = (() => {
  const raw = fs.readFileSync(path.join(__dirname, 'no-tta.sql'), 'utf8');
  return raw.replace(/\/\*[\s\S]*?\*\//, '').trim();
})();

// setFilters uses set_config() which is session-scoped. Wrapping both setFilters and
// the query in the same transaction guarantees they share a single PostgreSQL connection
// (via Sequelize CLS), so the session settings are visible to the SQL.
const runWithFilters = (filterValues) => db.sequelize.transaction(async () => {
  await setFilters(filterValues);
  return db.sequelize.query(sqlContent, { type: QueryTypes.SELECT });
});

const getPageData = (result) => {
  const dataset = result.find((d) => d.data_set === 'no_tta_page');
  if (!dataset || !dataset.data) return [];
  return dataset.data;
};

const getRecipientIds = (result) => getPageData(result).map((r) => r['recipient id']);

describe('no-tta.sql grantStatus filter', () => {
  let user;
  let activeNonCdiRecipient;
  let activeCdiRecipient;
  let activeNonCdiGrant;
  let activeCdiGrant;
  const arIds = [];
  const goalIds = [];
  const goalTemplateIds = [];
  const programIds = [];

  beforeAll(async () => {
    user = await createUser();

    // Recipient 1: Active non-CDI grant
    activeNonCdiRecipient = await Recipient.create({
      id: getUniqueId(),
      name: `No TTA Test NonCDI ${getUniqueId()}`,
      uei: `NNCDITST${getUniqueId(1000, 9999)}`,
    });
    activeNonCdiGrant = await Grant.create({
      id: getUniqueId(),
      number: `${getUniqueId()}NC`,
      regionId: 1,
      recipientId: activeNonCdiRecipient.id,
      status: 'Active',
      cdi: false,
      startDate: new Date('2020-01-01'),
      endDate: new Date(),
    }, { individualHooks: true });
    const nonCdiProgram = await Program.create({
      id: getUniqueId(),
      grantId: activeNonCdiGrant.id,
      programType: 'HS',
      status: 'Active',
    });
    programIds.push(nonCdiProgram.id);

    // Recipient 2: Active CDI grant
    activeCdiRecipient = await Recipient.create({
      id: getUniqueId(),
      name: `No TTA Test CDI ${getUniqueId()}`,
      uei: `NCDITST0${getUniqueId(1000, 9999)}`,
    });
    activeCdiGrant = await Grant.create({
      id: getUniqueId(),
      number: `${getUniqueId()}CDI`,
      regionId: 1,
      recipientId: activeCdiRecipient.id,
      status: 'Active',
      cdi: true,
      startDate: new Date('2020-01-01'),
      endDate: new Date(),
    }, { individualHooks: true });
    const cdiProgram = await Program.create({
      id: getUniqueId(),
      grantId: activeCdiGrant.id,
      programType: 'HS',
      status: 'Active',
    });
    programIds.push(cdiProgram.id);

    // Create old approved activity reports so grants pass the "has historical TTA" check in
    // Step 3.3 of no-tta.sql. The reports are older than 90 days so recipients still show
    // as "no TTA" in the widget.
    await Promise.all([activeNonCdiGrant, activeCdiGrant].map(async (grant) => {
      const goal = await createGoal({ grantId: grant.id, status: 'In Progress' });
      goalIds.push(goal.id);
      goalTemplateIds.push(goal.goalTemplateId);

      const ar = await ActivityReport.create({
        submissionStatus: 'submitted',
        calculatedStatus: 'approved',
        userId: user.id,
        regionId: 1,
        startDate: '2020-01-01',
        endDate: '2020-01-15',
        activityRecipientType: 'recipient',
        deliveryMethod: 'in-person',
        duration: 1,
        reason: ['reason'],
        participants: ['participants'],
        topics: ['Program Planning and Services'],
        ttaType: ['technical-assistance'],
        requester: 'requester',
        numberOfParticipants: 1,
        ECLKCResourcesUsed: ['resource'],
        targetPopulations: ['pop'],
        version: 2,
      });
      arIds.push(ar.id);

      await ActivityRecipient.create({ activityReportId: ar.id, grantId: grant.id });
      await ActivityReportGoal.create({
        activityReportId: ar.id,
        goalId: goal.id,
        status: 'In Progress',
      });
    }));
  });

  afterAll(async () => {
    await ActivityReportGoal.destroy({ where: { activityReportId: arIds } });
    await ActivityRecipient.destroy({ where: { activityReportId: arIds } });
    await ActivityReport.destroy({ where: { id: arIds } });
    await Goal.destroy({ where: { id: goalIds }, force: true, individualHooks: true });
    await GoalTemplate.destroy({ where: { id: goalTemplateIds } });
    await Program.destroy({ where: { id: programIds } });
    await Grant.destroy({
      where: { id: [activeNonCdiGrant.id, activeCdiGrant.id] },
      individualHooks: true,
    });
    await Recipient.destroy({
      where: { id: [activeNonCdiRecipient.id, activeCdiRecipient.id] },
    });
    await User.destroy({ where: { id: user.id } });
    await db.sequelize.close();
  });

  it('includes both active non-CDI and CDI recipients when no grant status filter is set', async () => {
    const result = await runWithFilters({ region: [1] });
    const ids = getRecipientIds(result);
    expect(ids).toContain(activeNonCdiRecipient.id);
    expect(ids).toContain(activeCdiRecipient.id);
  });

  it('shows only active non-CDI recipients when grantStatus is "active"', async () => {
    const result = await runWithFilters({ region: [1], grantStatus: ['active'] });
    const ids = getRecipientIds(result);
    expect(ids).toContain(activeNonCdiRecipient.id);
    expect(ids).not.toContain(activeCdiRecipient.id);
  });

  it('shows only CDI recipients when grantStatus is "interim-management-cdi"', async () => {
    const result = await runWithFilters({ region: [1], grantStatus: ['interim-management-cdi'] });
    const ids = getRecipientIds(result);
    expect(ids).not.toContain(activeNonCdiRecipient.id);
    expect(ids).toContain(activeCdiRecipient.id);
  });

  it('shows only CDI recipients when grantStatus is NOT "active"', async () => {
    const result = await runWithFilters({ region: [1], 'grantStatus.not': ['active'] });
    const ids = getRecipientIds(result);
    expect(ids).not.toContain(activeNonCdiRecipient.id);
    expect(ids).toContain(activeCdiRecipient.id);
  });

  it('shows only active non-CDI recipients when grantStatus is NOT "interim-management-cdi"', async () => {
    const result = await runWithFilters({ region: [1], 'grantStatus.not': ['interim-management-cdi'] });
    const ids = getRecipientIds(result);
    expect(ids).toContain(activeNonCdiRecipient.id);
    expect(ids).not.toContain(activeCdiRecipient.id);
  });
});
