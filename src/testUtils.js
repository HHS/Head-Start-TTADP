import faker from '@faker-js/faker';
import { Op } from 'sequelize';
import { ENTITY_TYPES, REPORT_STATUSES } from './constants';
import {
  ActivityReport,
  ActivityRecipient,
  Approval,
  User,
  UserRole,
  Recipient,
  Grant,
  Region,
  GoalTemplate,
  Goal,
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
    number: `0${faker.datatype.number({ min: 1, max: 9 })}${faker.animal.type()}`,
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

export async function destroyReport(report) {
  try {
    await ActivityRecipient.destroy({
      where: { activityReportId: report.id },
      individualHooks: true,
    });
  } catch (e) {
    console.log('caught error destroying activityrecipient where activityReportId = ', e);
  }

  const reports = await ActivityReport.findAll({
    where: { lastUpdatedById: report.owner.dataValues.userId },
    include: [
      {
        model: ActivityRecipient,
        as: 'activityRecipients',
        required: true,
      },
    ],
    individualHooks: true,
  });

  reports.forEach(async (r) => {
    await ActivityRecipient.destroy({
      where: { activityReportId: r.dataValues.id },
    });
    await Promise.all(r.activityRecipients.map(async (recipient) => {
      const grant = await Grant.findByPk(recipient.grantId);

      const otherRecipients = await ActivityRecipient.findAll({ where: { grantId: grant.id } });
      const otherGoals = await Goal.findAll({ where: { grantId: grant.id } });
      if (otherRecipients.length === 0 && otherGoals.length === 0) {
        await Grant.destroy({
          where: { id: grant.id },
          individualHooks: true,
        });
      }

      const results = await Grant.findAll({ where: { recipientId: grant.recipientId } });
      if (results.length === 0) {
        await Recipient.destroy({
          where: { id: grant.recipientId },
          individualHooks: true,
        });
      }
    }));
  });

  try {
    await ActivityReport.destroy({
      where: {
        [Op.or]: [
          { id: report.id },
          { lastUpdatedById: report.owner.dataValues.userId },
        ],
      },
      individualHooks: true,
    });
  } catch (e) {
    console.log('failed to destroy activityreport', e);
  }

  try {
    await Approval.destroy({
      where: { entityId: report.id, entityType: ENTITY_TYPES.REPORT },
      force: true,
      individualHooks: true,
    });
  } catch (e) {
    console.log('failed to destroy approval', e);
  }

  let results;

  try {
    results = await ActivityReport.findAll({
      include: [{
        model: Collaborator,
        as: 'owner',
        where: { userId: report.owner.dataValues.userId },
        required: true,
      }],
    });

    if (results.length === 0) {
      await Collaborator.destroy({
        where: { userId: report.owner.dataValues.userId },
        individualHooks: true,
      });

      await UserRole.destroy({
        where: { userId: report.owner.dataValues.userId },
        individualHooks: true,
      });

      await User.destroy({
        where: { id: report.owner.dataValues.userId },
        individualHooks: true,
      });
    }
  } catch (e) {
    console.log('failed to destroy user, userrole, collaborator', e);
  }

  try {
    results = await ActivityReport.findAll({
      where: { regionId: report.regionId },
      individualHooks: true,
    });
  } catch (e) {
    console.log('failed to find activityReports', e);
  }

  /* const grantResults = await Grant.findAll({ */
  /*   where: { regionId: report.regionId }, */
  /*   individualHooks: true, */
  /* }); */
  /**/
  /* if (results.length === 0 && grantResults.length === 0) { */
  /*   await Region.destroy({ */
  /*     where: { id: report.regionId }, */
  /*     individualHooks: true, */
  /*   }); */
  /* } */
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
