import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import { REPORT_STATUSES } from '@ttahub/common';
import filtersToScopes from '../index';
import {
  Recipient,
  Grant,
  Goal,
  ActivityReport,
  Program,
  User,
  Group,
  GroupGrant,
  ActivityRecipient,
  sequelize,
  GroupCollaborator,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
} from '../../models';
import {
  createGrant,
} from '../../testUtils';

// Re-export for convenience
export {
  Op,
  faker,
  REPORT_STATUSES,
  filtersToScopes,
  Recipient,
  Grant,
  Goal,
  ActivityReport,
  Program,
  User,
  Group,
  GroupGrant,
  ActivityRecipient,
  sequelize,
  GroupCollaborator,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  createGrant,
};

// Shared constants
export const draftReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  regionId: 1,
  version: 1,
};

export const recipientOneName = 'Gibson, Hammes and Schuster - White-Beaked Dolphin - 98464';
export const recipientTwoName = 'Flatley, Kling and Olson - Longman\'s Beaked Whale - 6796';
export const recipientThreeName = 'Kris, Hoeger and Ward - Southern Bottlenose Whale - 9393';
export const recipientFourName = 'Grant LLC - Irrawaddy Dolphin - 39678';

export const seed = 45997;
export const recipients = [
  {
    id: seed,
    name: recipientOneName,
  },
  {
    id: seed + 1,
    name: recipientTwoName,
  },
  {
    id: seed + 2,
    name: recipientThreeName,
  },
  {
    id: seed + 3,
    name: recipientFourName,
  },
  {
    id: seed + 4,
    name: recipientThreeName,
  },
  {
    id: seed + 5,
    name: recipientFourName,
  },
];

export const possibleIds = recipients.map((recipient) => recipient.id);

export const groupName = 'Hickle - Graham - Southern Bottlenose Whale - 96089';
export const publicGroupName = 'Gulgowski and Sons - Australian Snubfin Dolphin - 9916';
export const specialGrantNumber = '29971';

// Shared setup data that will be populated
export const sharedTestData = {
  mockUser: null,
  mockUserTwo: null,
  group: null,
  publicGroup: null,
  grantGroupOne: null,
  grantGroupTwo: null,
  grants: null,
  activityReports: null,
  activityRecipients: null,
  programs: null,
};

/**
 * Sets up all the shared test data for grants tests
 * This creates users, recipients, grants, activity reports, programs, and groups
 */
export async function setupSharedTestData() {
  sharedTestData.mockUser = await User.create({
    id: seed + 6,
    homeRegionId: 1,
    hsesUsername: '|2$t)rb5=83',
    hsesUserId: 'U;!?-X>FzF4',
    lastLogin: new Date(),
  });

  sharedTestData.mockUserTwo = await User.create({
    id: seed + 7,
    homeRegionId: 1,
    hsesUsername: 'Qk$B!O0VxW6',
    hsesUserId: '%d)""y`lRU8',
    lastLogin: new Date(),
  });

  await Promise.all(recipients.map((g) => Recipient.create(g)));

  sharedTestData.grants = await Promise.all([
    Grant.create({
      id: recipients[3].id,
      number: `${seed + 8}`,
      regionId: 4,
      recipientId: recipients[3].id,
      status: 'Active',
      startDate: new Date('08/03/2022'),
      endDate: new Date('08/03/2022'),
      programSpecialistName: 'No',
      stateCode: 'RI',
    }),
    Grant.create({
      id: recipients[0].id,
      number: specialGrantNumber,
      regionId: 1,
      recipientId: recipients[0].id,
      status: 'Active',
      startDate: new Date('07/01/2022'),
      endDate: new Date('07/01/2022'),
      programSpecialistName: 'No',
      stateCode: 'AZ',
    }),
    Grant.create({
      id: recipients[1].id,
      number: `${seed + 9}`,
      regionId: 1,
      recipientId: recipients[1].id,
      status: 'Active',
      startDate: new Date('08/01/2022'),
      endDate: new Date('08/01/2025'),
      programSpecialistName: 'Joe Bob',
      stateCode: 'AR',
    }),
    Grant.create({
      id: recipients[2].id,
      number: `${seed + 10}`,
      regionId: 3,
      recipientId: recipients[2].id,
      status: 'Active',
      startDate: new Date('08/01/2022'),
      endDate: new Date('08/01/2025'),
      programSpecialistName: 'Darcy',
      stateCode: 'AK',
    }),
    Grant.create({
      id: recipients[4].id,
      number: `${seed + 11}`,
      regionId: 1,
      recipientId: recipients[1].id,
      status: 'Inactive',
      startDate: new Date('07/01/2022'),
      endDate: new Date('08/01/2025'),
      programSpecialistName: 'Joe Bob',
      stateCode: 'AR',
      inactivationDate: new Date('07/26/2022'),
    }),
    Grant.create({
      id: recipients[5].id,
      number: `${seed + 12}`,
      regionId: 3,
      recipientId: recipients[2].id,
      status: 'Inactive',
      startDate: new Date('07/01/2022'),
      endDate: new Date('08/01/2025'),
      programSpecialistName: 'Darcy',
      stateCode: 'AK',
      inactivationDate: new Date('07/26/2022'),
    }),
    Grant.create({
      id: seed + 13,
      number: `${seed + 14}`,
      regionId: 1,
      recipientId: recipients[1].id,
      status: 'Active',
      startDate: new Date('08/03/2022'),
      endDate: new Date('08/03/2022'),
      programSpecialistName: 'Joe Bob',
      stateCode: 'AR',
    }),
  ]);

  // Create Activity Reports.
  sharedTestData.activityReports = await Promise.all([
    ActivityReport.create({
      ...draftReport,
      userId: sharedTestData.mockUser.id,
      startDate: new Date('01/01/2022'),
      endDate: new Date('01/15/2022'),
    }),
    ActivityReport.create({
      ...draftReport,
      userId: sharedTestData.mockUser.id,
      startDate: new Date('04/01/2022'),
      endDate: new Date('05/20/2022'),
    }),
    ActivityReport.create({
      ...draftReport,
      userId: sharedTestData.mockUser.id,
      startDate: new Date('03/02/2022'),
      endDate: new Date('03/15/2022'),
    }),
    ActivityReport.create({
      ...draftReport,
      userId: sharedTestData.mockUser.id,
      startDate: new Date('01/01/2022'),
      endDate: new Date('04/02/2022'),
    }),
    ActivityReport.create({
      ...draftReport,
      userId: sharedTestData.mockUser.id,
      startDate: new Date('03/31/2022'),
      endDate: new Date('05/20/2022'),
    }),
    ActivityReport.create({
      ...draftReport,
      userId: sharedTestData.mockUser.id,
      startDate: new Date('02/01/2022'),
      endDate: new Date('03/01/2022'),
    }),
    ActivityReport.create({
      ...draftReport,
      userId: sharedTestData.mockUser.id,
      startDate: new Date('01/01/2021'),
      endDate: new Date('03/01/2021'),
    }),
    ActivityReport.create({
      ...draftReport,
      userId: sharedTestData.mockUser.id,
      startDate: new Date('04/01/2022'),
      endDate: new Date('04/02/2022'),
    }),
  ]);

  // Create Activity Recipients.
  sharedTestData.activityRecipients = await Promise.all([
    ActivityRecipient.create({
      activityReportId: sharedTestData.activityReports[0].id,
      grantId: sharedTestData.grants[0].id,
    }),
    ActivityRecipient.create({
      activityReportId: sharedTestData.activityReports[1].id,
      grantId: sharedTestData.grants[1].id,
    }),
    ActivityRecipient.create({
      activityReportId: sharedTestData.activityReports[2].id,
      grantId: sharedTestData.grants[2].id,
    }),
    ActivityRecipient.create({
      activityReportId: sharedTestData.activityReports[3].id,
      grantId: sharedTestData.grants[3].id,
    }),
    ActivityRecipient.create({
      activityReportId: sharedTestData.activityReports[4].id,
      grantId: sharedTestData.grants[4].id,
    }),
    ActivityRecipient.create({
      activityReportId: sharedTestData.activityReports[5].id,
      grantId: sharedTestData.grants[5].id,
    }),
    ActivityRecipient.create({
      activityReportId: sharedTestData.activityReports[6].id,
      grantId: sharedTestData.grants[6].id,
    }),
  ]);

  sharedTestData.programs = await Promise.all([
    Program.create({
      id: recipients[0].id,
      grantId: recipients[0].id,
      startYear: 'no',
      startDate: new Date('01/01/2023'),
      endDate: new Date('01/01/2026'),
      status: 'Active',
      programType: 'EHS',
      name: 'no',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    Program.create({
      id: recipients[1].id,
      grantId: recipients[1].id,
      startYear: 'no',
      startDate: new Date('01/01/2023'),
      endDate: new Date('01/01/2025'),
      status: 'Active',
      programType: 'HS',
      name: 'no',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
    Program.create({
      id: recipients[2].id,
      grantId: recipients[2].id,
      startYear: 'no',
      startDate: new Date('01/01/2023'),
      endDate: new Date('01/01/2025'),
      status: 'Active',
      programType: 'HS',
      name: 'no',
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  ]);

  sharedTestData.group = await Group.create({
    name: groupName,
    isPublic: false,
  });

  await GroupCollaborator.create({
    userId: sharedTestData.mockUser.id,
    groupId: sharedTestData.group.id,
    collaboratorTypeId: 1,
  });

  sharedTestData.publicGroup = await Group.create({
    name: publicGroupName,
    isPublic: true,
  });

  await GroupCollaborator.create({
    userId: sharedTestData.mockUserTwo.id,
    groupId: sharedTestData.publicGroup.id,
    collaboratorTypeId: 1,
  });

  sharedTestData.grantGroupOne = await GroupGrant.create({
    groupId: sharedTestData.group.id,
    grantId: sharedTestData.grants[0].id,
  });

  sharedTestData.grantGroupTwo = await GroupGrant.create({
    groupId: sharedTestData.group.id,
    grantId: sharedTestData.grants[1].id,
  });

  await GroupGrant.create({
    groupId: sharedTestData.publicGroup.id,
    grantId: sharedTestData.grants[0].id,
  });

  await GroupGrant.create({
    groupId: sharedTestData.publicGroup.id,
    grantId: sharedTestData.grants[1].id,
  });

  return sharedTestData;
}

/**
 * Tears down all shared test data
 */
export async function tearDownSharedTestData() {
  const {
    grants,
    activityReports,
    activityRecipients,
    programs,
    group,
    publicGroup,
    mockUser,
    mockUserTwo,
  } = sharedTestData;

  await GroupGrant.destroy({
    where: {
      [Op.or]: [
        {
          groupId: group.id,
          grantId: grants[0].id,
        },
        {
          groupId: group.id,
          grantId: grants[1].id,
        },
        {
          groupId: publicGroup.id,
          grantId: grants[0].id,
        },
        {
          groupId: publicGroup.id,
          grantId: grants[1].id,
        },
      ],
    },
  });

  await GroupCollaborator.destroy({
    where: {
      [Op.or]: [
        {
          userId: mockUserTwo.id,
          groupId: publicGroup.id,
          collaboratorTypeId: 1,
        },
        {
          userId: mockUser.id,
          groupId: group.id,
          collaboratorTypeId: 1,
        },
      ],
    },
  });

  await Group.destroy({
    where: {
      [Op.or]: [
        {
          name: groupName,
          isPublic: false,
        },
        {
          name: publicGroupName,
          isPublic: true,
        },
      ],
    },
  });

  await Program.destroy({
    where: {
      id: programs.map((p) => p.id),
    },
  });

  await ActivityRecipient.destroy({
    where: {
      id: activityRecipients.map((ar) => ar.id),
    },
  });

  await ActivityReport.destroy({
    where: {
      id: activityReports.map((ar) => ar.id),
    },
  });

  await GoalFieldResponse.destroy({ where: {}, force: true });
  await Goal.destroy({ where: {}, force: true });

  await Grant.destroy({
    where: {
      id: grants.map((g) => g.id),
    },
    individualHooks: true,
  });

  await Recipient.destroy({
    where: {
      id: possibleIds,
    },
  });

  await User.destroy({
    where: {
      id: [mockUser.id, mockUserTwo.id],
    },
  });
}
