import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { REPORT_STATUSES } from './constants';
import {
  ActivityReport,
  ActivityRecipient,
  ActivityReportFile,
  File,
  User,
  UserRole,
  Role,
  Recipient,
  Grant,
  Region,
  GoalTemplate,
  Goal,
  Objective,
  Collaborator,
  // GrantGoal,
} from './models';
import { auditLogger } from './logger';
import { createOrUpdate } from './services/activityReports';

import { GOAL_STATUS as GOAL_STATUS_CONST } from './widgets/goalStatusGraph';

const GOAL_STATUS = [Object.values(GOAL_STATUS_CONST)];

function defaultGoal() {
  return {
    name: faker.random.words(10),
    status: GOAL_STATUS[Math.floor(Math.random() * GOAL_STATUS.length)],
    isFromSmartsheetTtaPlan: false,
  };
}

function defaultReport() {
  return {
    activityRecipientType: 'recipient',
    approval: {
      submissionStatus: REPORT_STATUSES.SUBMITTED,
      calculatedStatus: REPORT_STATUSES.APPROVED,
    },
    ECLKCResourcesUsed: [faker.random.words(1)],
    numberOfParticipants: faker.datatype.number({ min: 1, max: 20 }),
    deliveryMethod: 'in-person',
    duration: faker.datatype.number({ min: 1, max: 10 }),
    regionId: 20,
    endDate: '2021-01-01T12:00:00Z',
    startDate: '2021-01-01T12:00:00Z',
    requester: 'requester',
    targetPopulations: ['pop'],
    reason: ['reason'],
    participants: ['participants', 'genies'],
    topics: ['Program Planning and Services'],
    ttaType: ['technical-assistance'],
  };
}

function defaultUser() {
  return {
    homeRegionId: 5,
    hsesUsername: faker.internet.email(),
    hsesUserId: `fake${faker.unique(() => faker.datatype.number({ min: 1, max: 10000 }))}`,
    email: faker.internet.email(),
    phoneNumber: faker.phone.phoneNumber(),
    name: faker.name.findName(),
    role: ['Grants Specialist'],
  };
}

async function createUser(user) {
  return User.create({ ...defaultUser(), ...user });
}

function defaultRegion() {
  const number = faker.datatype.number({ min: 1, max: 1000 });
  return {
    id: faker.unique(() => number, { maxRetries: 20 }),
    name: number,
  };
}

async function createRegion(region) {
  return Region.create({ ...defaultRegion(), ...region });
}

function defaultGrant() {
  return {
    id: faker.datatype.number({ min: 10000, max: 100000 }),
    number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
    regionId: 10,
    status: 'Active',
    startDate: new Date('2021/01/01'),
  };
}

export async function createRecipient(recipient) {
  return Recipient.create({
    id: faker.datatype.number({ min: 10000, max: 100000 }),
    name: faker.company.companyName(),
    uei: 'NNA5N2KHMGN2',
    ...recipient,
  });
}

export async function createGrant(grant = {}) {
  let g = await Recipient.findByPk(grant.recipientId);
  if (!g) {
    g = await createRecipient({});
  }

  return Grant.create({ ...defaultGrant(), ...grant, recipientId: g.id });
}

export async function createReport(report) {
  const {
    activityRecipients,
    userId,
    regionId,
    ...reportData
  } = report;
  const grantIds = activityRecipients.map((recipient) => recipient.grantId);
  const region = regionId || defaultReport().regionId;

  let foundRegion = await Region.findByPk(region);
  if (!foundRegion) {
    foundRegion = await createRegion({ id: region });
  }

  const recipients = await Promise.all(grantIds.map(async (gId) => {
    let foundGrant = await Grant.findByPk(gId);

    if (!foundGrant) {
      foundGrant = await createGrant({ id: gId, regionId: foundRegion.id });
    }
    return foundGrant.id;
  }));

  let foundUser = await User.findByPk(userId);
  if (!foundUser) {
    foundUser = await createUser();
  }

  let createdReport;
  try {
    createdReport = await createOrUpdate({
      ...defaultReport(),
      ...reportData,
      regionId: foundRegion.id,
      owner: { userId: foundUser.id },
    });
  } catch (err) {
    auditLogger.error(JSON.stringify({ name: 'createReport-createOrUpdate', err }));
    throw err;
  }

  try {
    Promise.all(recipients.map((grantId) => ActivityRecipient.create({
      activityReportId: createdReport.id,
      grantId,
    })));
  } catch (error) {
    auditLogger.error(JSON.stringify(error));
    throw error;
  }

  return createdReport;
}

export async function destroyReport(r) {
  let id;

  if (typeof r === 'number') {
    id = r;
  } else if (typeof r === 'object') {
    if (r.dataValues) {
      id = r.dataValues.id;
    } else if (r.id) {
      id = r.id;
    } else {
      throw new Error(`destroyReport: expected report to be number or ActivityReport object, got ${r}`);
    }
  } else {
    throw new Error(`destroyReport: expected report to be number or ActivityReport object, got ${r}`);
  }

  const report = await ActivityReport.unscoped().findOne({
    where: { id },
    individualHooks: true,
  });

  if (!report) return;

  // Get all ActivityRecipients
  const activityRecipients = await ActivityRecipient.findAll({
    where: { activityReportId: report.id },
  });

  // Get all Grants
  const grants = await Grant.findAll({
    where: { id: { [Op.in]: activityRecipients.map((ar) => ar.dataValues.grantId) } },
  });

  // Get all Recipients
  const recipients = await Recipient.findAll({
    where: { id: { [Op.in]: grants.map((g) => g.dataValues.recipientId) } },
  });

  // Get all Goals
  const goals = await Goal.findAll({
    where: { grantId: { [Op.in]: grants.map((g) => g.dataValues.id) } },
  });

  // Get all Objectives
  const objectives = await Objective.findAll({
    where: { goalId: { [Op.in]: goals.map((g) => g.dataValues.id) } },
  });

  // Get all Collaborators so that we can get all Users.
  const collaborators = await Collaborator.findAll({
    where: { entityId: id },
  });

  // Get all Users
  const users = await User.findAll({
    where: { id: { [Op.in]: collaborators.map((c) => c.dataValues.userId) } },
  });

  // Get all UserRoles so we can find Roles to destroy.
  const userRoles = await UserRole.findAll({
    where: { userId: { [Op.in]: users.map((u) => u.dataValues.id) } },
  });

  // Get all Roles
  const roles = await Role.findAll({
    where: { id: { [Op.in]: userRoles.map((ur) => ur.dataValues.roleId) } },
  });

  // Get all ActivityReportFiles
  const activityReportFiles = await ActivityReportFile.findAll({
    where: { activityReportId: id },
  });

  // Get all Files
  const files = await File.findAll({
    where: { id: { [Op.in]: activityReportFiles.map((arf) => arf.dataValues.fileId) } },
  });

  // Destroy the ActivityReport.
  await report.destroy({ individualHooks: true });

  // ActivityReport hooks should have removed:
  // - Collaborators
  // - CollaboratorRoles
  // - Approvals
  // - ActivityReportGoals
  // - ActivityReportObjectives
  // - ActivityRecipients

  // Remaining to manually destroy:
  // - Recipients
  // - Grants
  // - Goals
  // - Objectives
  // - UserRoles
  // - Roles
  // - Users
  try {
    await Promise.allSettled([
      ...activityReportFiles.map((model) => model.destroy({ individualHooks: true })),
      ...files.map((model) => model.destroy({ individualHooks: true })),
      ...grants.map((model) => model.destroy({ individualHooks: true })),
      ...recipients.map((model) => model.destroy({ individualHooks: true })),
      ...objectives.map((model) => model.destroy({ individualHooks: true })),
      ...goals.map((model) => model.destroy({ individualHooks: true })),
      ...userRoles.map((model) => model.destroy({ individualHooks: true })),
      ...users.map((model) => model.destroy({ individualHooks: true })),
      ...roles.map((model) => model.destroy({ individualHooks: true })),
    ]);
  } catch (e) {
    // console.log('error destroying', e);
  }
}

export async function createGoal(goal) {
  let grant = await Grant.findByPk(goal.grantId);

  if (!grant) {
    grant = await createGrant({});
  }
  const dg = defaultGoal();
  const dbGoalTemplate = await GoalTemplate.findOrCreate({
    where: { templateName: dg.name },
    defaults: { templateName: dg.name },
  });
  return Goal.create({
    ...dg,
    ...goal,
    grantId: grant.id,
    goalTemplateId: dbGoalTemplate.id,
  });
}

export async function destroyGoal(goal) {
  return Goal.destroy({
    where: {
      id: goal.id,
    },
    individualHooks: true,
  });
}
