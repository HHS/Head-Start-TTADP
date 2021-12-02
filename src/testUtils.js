import faker from 'faker';

import { REPORT_STATUSES } from './constants';
import {
  ActivityReport,
  ActivityRecipient,
  User,
  Grantee,
  Grant,
  Region,
} from './models';

function defaultReport() {
  return {
    activityRecipientType: 'grantee',
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
  const number = faker.datatype.number({ min: 1, max: 12 });
  return {
    id: faker.unique(() => number),
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

async function createGrantee(grantee) {
  return Grantee.create({
    id: faker.datatype.number({ min: 10000, max: 100000 }),
    name: faker.company.companyName(),
    ...grantee,
  });
}

async function createGrant(grant) {
  let g = await Grantee.findByPk(grant.granteeId);
  if (!g) {
    g = await createGrantee({});
  }

  return Grant.create({ ...defaultGrant(), ...grant, granteeId: g.id });
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
          model: Grantee,
          as: 'grantee',
        }],
      }],
    }],
  });

  await ActivityRecipient.destroy({
    where: {
      activityReportId: dbReport.id,
    },
  });

  try {
    User.destroy({
      where: {
        id: dbReport.userId,
      },
    });
  } catch (error) {
    // ignore fk errors
  }

  const destroys = dbReport.activityRecipients.map(async (recipient) => {
    const grant = await Grant.findByPk(recipient.grantId);

    try {
      await ActivityRecipient.destroy({
        where: {
          id: recipient.id,
        },
      });

      await Grant.destroy({
        where: {
          id: grant.id,
        },
      });

      await Grantee.destroy({
        where: {
          id: grant.granteeId,
        },
      });
    } catch (e) {
      // ignore fk errors
    }
  });

  await Promise.all(destroys);
  await ActivityReport.destroy({
    where: {
      id: report.id,
    },
  });
  try {
    await Region.destroy({
      where: {
        id: report.regionId,
      },
    });
  } catch (e) {
    // ignore fk errors
  }
}
