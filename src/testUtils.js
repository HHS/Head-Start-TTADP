import faker from 'faker';

import { REPORT_STATUSES } from './constants';
import {
  ActivityReport,
  ActivityRecipient,
  User,
  Recipient,
  Grant,
  Region,
  Goal,
  GrantGoal,
} from './models';

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
    submissionStatus: REPORT_STATUSES.SUBMITTED,
    calculatedStatus: REPORT_STATUSES.APPROVED,
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
    ...recipient,
  });
}

export async function createGrant(grant) {
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

  const createdReport = await ActivityReport.create({
    ...defaultReport(),
    ...reportData,
    regionId: foundRegion.id,
    userId: foundUser.id,
  });

  Promise.all(recipients.map((grantId) => ActivityRecipient.create({
    activityReportId: createdReport.id,
    grantId,
  })));

  return createdReport;
}

export async function destroyReport(report) {
  const dbReport = await ActivityReport.findByPk(report.id, {
    include: [{
      model: ActivityRecipient,
      as: 'activityRecipients',
      include: [{
        model: Grant,
        as: 'grant',
        include: [{
          model: Recipient,
          as: 'recipient',
        }],
      }],
    }],
  });

  await ActivityRecipient.destroy({
    where: {
      activityReportId: dbReport.id,
    },
  });

  const destroys = dbReport.activityRecipients.map(async (recipient) => {
    const grant = await Grant.findByPk(recipient.grantId);
    await ActivityRecipient.destroy({
      where: {
        id: recipient.id,
      },
    });

    let results = await ActivityRecipient.findAll({ where: { grantId: grant.id } });
    if (results.length === 0) {
      await Grant.destroy({
        where: {
          id: grant.id,
        },
      });
    }

    results = await Grant.findAll({ where: { recipientId: grant.recipientId } });
    if (results.length === 0) {
      await Recipient.destroy({
        where: {
          id: grant.recipientId,
        },
      });
    }
  });

  await Promise.all(destroys);
  await ActivityReport.destroy({
    where: {
      id: report.id,
    },
  });

  let results = await ActivityReport.findAll({ where: { userId: dbReport.userId } });
  if (results.length === 0) {
    await User.destroy({
      where: {
        id: dbReport.userId,
      },
    });
  }

  results = await ActivityReport.findAll({
    where: {
      regionId: report.regionId,
    },
  });

  const grantResults = await Grant.findAll({
    where: {
      regionId: report.regionId,
    },
  });

  if (results.length === 0 && grantResults.length === 0) {
    await Region.destroy({
      where: {
        id: report.regionId,
      },
    });
  }
}

export async function createGoal(goal) {
  let grant = await Grant.findByPk(goal.grantId);

  if (!grant) {
    grant = await createGrant({});
  }

  const dbGoal = await Goal.create({ ...defaultGoal(), ...goal });
  await GrantGoal.create({ grantId: grant.id, goalId: dbGoal.id, recipientId: grant.recipientId });
  return dbGoal;
}

export async function destroyGoal(goal) {
  const { id: goalId } = goal;
  await GrantGoal.destroy({ where: { goalId } });
  return Goal.destroy({
    where: {
      id: goal.id,
    },
  });
}
