import crypto from 'crypto';
import faker from '@faker-js/faker';
import { REPORT_STATUSES, TRAINING_REPORT_STATUSES } from '@ttahub/common';
import { AUTOMATIC_CREATION } from './constants';
import {
  ActivityReport,
  ActivityRecipient,
  User,
  Recipient,
  Grant,
  Region,
  GoalTemplate,
  Goal,
  EventReportPilot,
  SessionReport,
} from './models';
import { auditLogger } from './logger';

import { GOAL_STATUS as GOAL_STATUS_CONST } from './widgets/goalStatusByGoalName';

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
    version: 2,
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
    lastLogin: new Date(),
  };
}

export async function createUser(user) {
  return User.create({ ...defaultUser(), ...user });
}

function defaultRegion() {
  // eslint-disable-next-line max-len
  const number = faker.unique(() => faker.datatype.number({ min: 50, max: 2000 }));
  return {
    id: number,
    name: `Region ${number}`,
  };
}

export async function createRegion(region) {
  return Region.create({ ...defaultRegion(), ...region });
}

function defaultGrant() {
  return {
    id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
    number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
    regionId: 10,
    status: 'Active',
    startDate: new Date('2021/01/01'),
    endDate: new Date(),
  };
}

export async function createRecipient(recipient) {
  return Recipient.create({
    id: faker.unique(() => faker.datatype.number({ min: 10000, max: 30000 })),
    // eslint-disable-next-line max-len
    name: faker.company.companyName() + faker.company.companySuffix() + faker.datatype.number({ min: 1, max: 1000 }),
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

  const createdReport = await ActivityReport.create({
    ...defaultReport(),
    ...reportData,
    regionId: foundRegion.id,
    userId: foundUser.id,
  });

  try {
    await Promise.all(recipients.map((grantId) => ActivityRecipient.create({
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

  await Promise.all(dbReport.activityRecipients.map(async (recipient) => {
    const grant = await Grant.findByPk(recipient.grantId);

    const otherRecipients = await ActivityRecipient.findAll({ where: { grantId: grant.id } });
    const otherGoals = await Goal.findAll({ where: { grantId: grant.id } });
    if (otherRecipients.length === 0 && otherGoals.length === 0) {
      await Grant.destroy({
        where: {
          id: grant.id,
        },
        individualHooks: true,
      });
    }

    const results = await Grant.findAll({ where: { recipientId: grant.recipientId } });
    if (results.length === 0) {
      await Recipient.destroy({
        where: {
          id: grant.recipientId,
        },
      });
    }
  }));

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
  const dg = defaultGoal();
  const dbGoalTemplate = goal.goalTemplateId
    ? { id: goal.goalTemplateId }
    : (await GoalTemplate.findOrCreate({
      where: { templateName: dg.name },
      defaults: { templateName: dg.name },
    }))[0];
  const dbGoal = await Goal.create({
    ...dg,
    ...goal,
    grantId: grant.id,
    goalTemplateId: dbGoalTemplate.id,
  });
  return dbGoal;
}

export async function destroyGoal(goal) {
  return Goal.destroy({
    where: {
      id: goal.id,
    },
    force: true,
    individualHooks: true,
  });
}

/**
 *
 * @param {string} name? template name
 * @returns GoalTemplate sequelize.model object
 */
export async function createGoalTemplate({
  name = null,
  creationMethod = AUTOMATIC_CREATION,
} = {
  name: null,
  creationMethod: AUTOMATIC_CREATION,
}) {
  const n = faker.lorem.sentence(5);
  const varForNameOrN = name || n;
  const secret = 'secret';
  const hash = crypto
    .createHmac('md5', secret)
    .update(varForNameOrN)
    .digest('hex');

  return GoalTemplate.create({
    hash,
    templateName: varForNameOrN,
    creationMethod,
  });
}

export function mockTrainingReportData(data) {
  return {
    goal: 'The goal is that recipients have well written, fundable grant applications that reflect their community needs, includes data, and data informed decisions. The Regional Office and TTA have identified that 75% of our recipients will be completing a baseline application within the next 18 months. Staggering the supports and training for the grant application where the applications do sooner have different supports vs. programs who have 12-18 months to implement best practices when it comes to the grant application.\n',
    region: 0,
    status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
    vision: '\nThe series will have the following five sessions for recipients who have 6-12 months to complete their application.\n1. Grant Application Process & Nuts and Bolts of Strategic Planning \n2. Development of the Community & Self-Assessment\n3. Program and School Readiness Goals\n4. Education & Health Services\n5. Financial Essentials to Create a Fundable Application\n\nWe selected the target population as all below since they all will be discussed throughout the grant application process; programs should take that all into consideration when writing a baseline grant application.',
    creator: faker.internet.email(),
    endDate: '12/11/2023',
    eventId: `R08-TR-23-${faker.datatype.number({ min: 1000, max: 9999 })}`,
    reasons: [
      'Full Enrollment',
      'Ongoing Quality Improvement',
      'School Readiness Goals',
    ],
    audience: 'Recipients',
    'IST Name:': faker.hacker.noun(),
    eventName: 'Baseline Grant Application Nuts and Bolts',
    pageState: {
      1: 'Complete',
      2: 'Complete',
      3: 'In progress',
    },
    startDate: '10/10/2023',
    pocComplete: false,
    trainingType: 'Series',
    pocCompleteId: '',
    '﻿Sheet Name': '',
    eventOrganizer: 'Regional PD Event (with National Centers)',
    pocCompleteDate: '',
    targetPopulations: [
      'Affected by Child Welfare Involvement',
      'Affected by Disaster',
      'Affected by Substance Use',
      'Children Experiencing Homelessness',
      'Children/Families affected by traumatic events (select the other reasons for child welfare, disaster, substance use or homelessness)',
      'Children in Migrant and Seasonal Families',
      'Children with Disabilities',
      'Children with Special Health Care Needs',
      'Dual-Language Learners',
      'Infants and Toddlers (ages birth to 3)',
      'Parents/Families impacted by health disparities.',
      'Preschool Children (ages 3-5)',
    ],
    eventIntendedAudience: 'recipients',
    'National Center(s) Requested': 'PMFO',
    'Event Duration/# NC Days of Support': 'Series',
    ...data,
  };
}

export async function createTrainingReport(report) {
  const {
    collaboratorIds,
    pocIds,
    ownerId,
    data,
  } = report;

  let userCreator = await User.findByPk(ownerId);
  if (!userCreator) {
    userCreator = await createUser();
  }

  const userCollaborators = await Promise.all(collaboratorIds.map(async (id) => {
    let user = await User.findByPk(id);
    if (!user) {
      user = await createUser();
    }
    return user.id;
  }));

  const userPocs = await Promise.all(pocIds.map(async (id) => {
    let user = await User.findByPk(id);
    if (!user) {
      user = await createUser();
    }
    return user.id;
  }));

  return EventReportPilot.create({
    data: mockTrainingReportData(data || {}),
    collaboratorIds: userCollaborators,
    ownerId: userCreator.id,
    regionId: userCreator.homeRegionId,
    imported: {},
    pocIds: userPocs,
  });
}

export function mockSessionData(data) {
  return {
    files: [
      {
        id: 42698,
        key: '709a0aec-b8a6-433f-8380-e2cdece1b492pdf',
        url: {
          url: faker.internet.url(),
          error: null,
        },
        status: 'QUEUEING_FAILED',
        fileSize: 10306065,
        createdAt: '2023-11-29T14:15:25.840Z',
        updatedAt: '2023-11-29T14:15:26.276Z',
        originalFileName: faker.system.fileName(),
      },
    ],
    status: TRAINING_REPORT_STATUSES.NOT_STARTED,
    context: 'Participants will know what data to collect (CA, SA and other) and how to utilize that data for their baseline application.',
    endDate: '10/23/2023',
    eventId: '8030',
    ownerId: null,
    duration: 1,
    regionId: 8,
    eventName: faker.datatype.string(100),
    objective: faker.datatype.string(100),
    pageState: {
      1: 'Complete',
      2: 'Complete',
      3: 'Complete',
      4: 'Complete',
      5: 'In progress',
    },
    startDate: '10/23/2023',
    eventOwner: 305,
    recipients: [
      {
        label: faker.datatype.string(100),
        value: faker.datatype.number(10000),
      },
      {
        label: faker.datatype.string(100),
        value: faker.datatype.number(10000),
      },
      {
        label: faker.datatype.string(100),
        value: faker.datatype.number(10000),
      },
    ],
    pocComplete: true,
    sessionName: faker.datatype.string(100),
    ttaProvided: faker.datatype.string(250),
    participants: [
      'CEO / CFO / Executive',
      'Coach',
      'Family Service Worker / Case Manager',
      'Fiscal Manager/Team',
      'Manager / Coordinator / Specialist',
      'Program Director (HS / EHS)',
      'Program Support / Administrative Assistant',
    ],
    pocCompleteId: '185',
    deliveryMethod: 'virtual',
    eventDisplayId: 'R08-TR-23-8030',
    objectiveTopics: [
      'Five-Year Grant',
      'Fiscal / Budget',
    ],
    pocCompleteDate: '2023-12-04',
    objectiveTrainers: [
      'PFMO',
    ],
    objectiveResources: [
      {
        value: '',
      },
    ],
    recipientNextSteps: [
      {
        note: 'Recipients will utilize sources of data from the self-assessment and the community assessment to inform the development of the baseline grant application.',
        completeDate: '06/14/2024',
      },
    ],
    specialistNextSteps: [
      {
        note: 'Specialists deployed to support recipients in developing a baseline grant will be available to answer questions related to using data from SA and CA. ',
        completeDate: '02/09/2024',
      },
    ],
    numberOfParticipants: 33,
    objectiveSupportType: 'Planning',
    supportingAttachments: [],
    'pageVisited-supporting-attachments': 'true',
    ...data,
  };
}

export async function createSessionReport(report) {
  const { eventId, data } = report;

  const event = await EventReportPilot.findOne({
    where: { id: eventId },
    attributes: ['id'],
  });

  return SessionReport.create({
    data: mockSessionData(data || {}),
    eventId: event?.id || await createTrainingReport({}).id,
  });
}
