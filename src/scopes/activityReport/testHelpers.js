import { faker } from '@faker-js/faker';
import { APPROVER_STATUSES, REPORT_STATUSES } from '@ttahub/common';
import { Op } from 'sequelize';
import { GOAL_STATUS } from '../../constants';
import { auditLogger } from '../../logger';
import db, {
  ActivityRecipient,
  ActivityReport,
  ActivityReportApprover,
  ActivityReportCollaborator,
  ActivityReportGoal,
  ActivityReportGoalFieldResponse,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReportResource,
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  Grant,
  Group,
  GroupCollaborator,
  GroupGrant,
  Objective,
  OtherEntity,
  Program,
  Recipient,
  Resource,
  Role,
  Topic,
  User,
  UserRole,
} from '../../models';
import { createActivityReportObjectiveFileMetaData } from '../../services/files';
import {
  findOrCreateResources,
  processActivityReportForResourcesById,
} from '../../services/resource';
import {
  createGoal,
  createGrant,
  createRecipient,
  createReport,
  destroyReport,
  getUniqueId,
} from '../../testUtils';
import filtersToScopes from '../index';
import * as utils from '../utils';
import { formatDeliveryMethod } from './deliveryMethod';
import { myReportsScopes } from './myReports';

// Mock users

export const mockUser = {
  id: getUniqueId(),
  homeRegionId: 1,
  name: 'user13706689',
  hsesUsername: 'user13706689',
  hsesUserId: 'user13706689',
  lastLogin: new Date(),
};

export const mockUserTwo = {
  id: getUniqueId(),
  homeRegionId: 1,
  name: 'user137065478',
  hsesUsername: 'user137065478',
  hsesUserId: 'user137065478',
  lastLogin: new Date(),
};

export const mockManager = {
  id: getUniqueId(),
  homeRegionId: 1,
  name: 'user50565590',
  hsesUsername: 'user50565590',
  hsesUserId: 'user50565590',
  lastLogin: new Date(),
};

// Report templates
export const draftReport = {
  submissionStatus: REPORT_STATUSES.DRAFT,
  userId: mockUser.id,
  regionId: 1,
  version: 2,
};

export const submittedReport = {
  ...draftReport,
  submissionStatus: REPORT_STATUSES.SUBMITTED,
  numberOfParticipants: 1,
  deliveryMethod: 'method',
  duration: 0,
  endDate: '2000-01-01T12:00:00Z',
  startDate: '2000-01-01T12:00:00Z',
  activityRecipientType: 'recipient',
  requester: 'requester',
  targetPopulations: ['Children with Disabilities', 'Infants and Toddlers (ages birth to 3)'],
  reason: ['reason'],
  activityReason: 'reason',
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
  language: ['English'],
  creatorRole: 'COR',
};

export const approvedReport = {
  ...submittedReport,
  calculatedStatus: REPORT_STATUSES.APPROVED,
};

export const deletedReport = {
  submissionStatus: REPORT_STATUSES.DELETED,
  userId: mockUser.id,
  regionId: 1,
  version: 2,
};

// Approver templates
export const approverApproved = {
  userId: mockManager.id,
  status: APPROVER_STATUSES.APPROVED,
  note: 'great work',
};

export const approverRejected = {
  userId: mockManager.id,
  status: APPROVER_STATUSES.NEEDS_ACTION,
  note: 'change x, y, z',
};

export const validTopics = new Set(['Topic 1', 'Topic 2', 'Topic 3', 'Topic 4', 'another topic']);

// Roles the scope tests filter on. Tests must never rely on seed data, so these
// are created if missing and torn down only when this suite created them.
export const requiredRoles = [
  { name: 'GS', fullName: 'Grantee Specialist', isSpecialist: true },
  { name: 'SS', fullName: 'System Specialist', isSpecialist: true },
  { name: 'GS', fullName: 'Grants Specialist', isSpecialist: true },
  { name: 'ECM', fullName: 'Early Childhood Manager', isSpecialist: false },
  { name: 'GSM', fullName: 'Grantee Specialist Manager', isSpecialist: false },
  { name: 'TTAC', fullName: 'TTAC', isSpecialist: false },
];

// Shared test data
export const sharedTestData = {
  // roles keyed by fullName, populated by setupSharedTestData
  roles: {},
  // ids of roles this suite created, so teardown leaves pre-existing roles alone
  createdRoleIds: [],
};

/**
 * Sets up shared test data used across multiple test files
 */
export async function setupSharedTestData() {
  await User.create(mockUser);
  await User.create(mockUserTwo);
  await User.create(mockManager);

  sharedTestData.includedUser1 = await User.create({
    name: 'person',
    hsesUserId: 'user111',
    hsesUsername: 'user111',
    lastLogin: new Date(),
  });

  sharedTestData.includedUser2 = await User.create({
    name: 'another person',
    hsesUserId: 'user222',
    hsesUsername: 'user222',
    lastLogin: new Date(),
  });

  sharedTestData.includedUser3 = await User.create({
    name: 'third person',
    hsesUserId: 'user536',
    hsesUsername: 'user536',
  });

  sharedTestData.excludedUser = await User.create({
    name: 'excluded',
    hsesUserId: 'user333',
    hsesUsername: 'user333',
    lastLogin: new Date(),
  });

  sharedTestData.globallyExcludedReport = await ActivityReport.create(
    {
      ...draftReport,
      deliveryMethod: 'method',
      updatedAt: '2000-01-01',
    },
    {
      silent: true,
    }
  );

  // Create roles if they don't exist. Roles are seeded with explicit ids, which
  // leaves the id sequence behind the highest existing id, so an insert that
  // relies on the sequence collides on the primary key -- allocate ids above the
  // current max instead. Each role gets its own candidate id so the lookups can
  // still run in parallel.
  sharedTestData.roles = {};
  sharedTestData.createdRoleIds = [];

  const maxRoleId = (await Role.max('id')) || 0;

  await Promise.all(
    requiredRoles.map(async ({ fullName, ...defaults }, index) => {
      const [role, created] = await Role.findOrCreate({
        where: { fullName },
        defaults: { ...defaults, fullName, id: maxRoleId + index + 1 },
      });

      sharedTestData.roles[fullName] = role;

      if (created) {
        sharedTestData.createdRoleIds.push(role.id);
      }
    })
  );

  jest.spyOn(utils, 'getValidTopicsSet').mockResolvedValue(validTopics);
}

/**
 * Tears down shared test data
 */
export async function tearDownSharedTestData() {
  const userIds = [
    mockUser.id,
    mockUserTwo.id,
    mockManager.id,
    sharedTestData.includedUser1.id,
    sharedTestData.includedUser2.id,
    sharedTestData.includedUser3.id,
    sharedTestData.excludedUser.id,
  ];

  const reports = await ActivityReport.unscoped().findAll({
    where: {
      userId: userIds,
    },
  });

  const ids = reports.map((report) => report.id);
  await ActivityReportApprover.destroy({
    where: { activityReportId: ids },
    force: true,
  });
  await ActivityReport.unscoped().destroy({ where: { id: ids } });
  await User.destroy({
    where: {
      id: userIds,
    },
  });

  // only remove roles this suite created; pre-existing roles are left in place
  if (sharedTestData.createdRoleIds.length) {
    await UserRole.destroy({ where: { roleId: sharedTestData.createdRoleIds } });
    await Role.destroy({ where: { id: sharedTestData.createdRoleIds } });
    sharedTestData.createdRoleIds = [];
  }

  await db.sequelize.close();
}

// Re-export commonly used items
export const { sequelize } = db;
export {
  ActivityRecipient,
  ActivityReport,
  ActivityReportApprover,
  ActivityReportCollaborator,
  ActivityReportGoal,
  ActivityReportGoalFieldResponse,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  ActivityReportResource,
  APPROVER_STATUSES,
  auditLogger,
  createActivityReportObjectiveFileMetaData,
  createGoal,
  createGrant,
  createRecipient,
  createReport,
  destroyReport,
  faker,
  filtersToScopes,
  findOrCreateResources,
  formatDeliveryMethod,
  GOAL_STATUS,
  Goal,
  GoalFieldResponse,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  Grant,
  Group,
  GroupCollaborator,
  GroupGrant,
  myReportsScopes,
  Objective,
  Op,
  OtherEntity,
  Program,
  processActivityReportForResourcesById,
  REPORT_STATUSES,
  Recipient,
  Resource,
  Role,
  Topic,
  User,
  UserRole,
};
