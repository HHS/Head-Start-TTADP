import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import {
  REPORT_STATUSES,
  APPROVER_STATUSES,
} from '@ttahub/common';
import { GOAL_STATUS } from '../../constants';
import filtersToScopes from '../index';
import { auditLogger } from '../../logger';
import db, {
  ActivityReport,
  ActivityReportApprover,
  ActivityReportResource,
  ActivityRecipient,
  User,
  Recipient,
  Resource,
  Grant,
  ActivityReportCollaborator,
  OtherEntity,
  Program,
  Role,
  UserRole,
  Goal,
  Objective,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Topic,
  Group,
  GroupGrant,
  ActivityReportGoal,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  ActivityReportGoalFieldResponse,
  GroupCollaborator,
} from '../../models';
import {
  createReport,
  destroyReport,
  createGrant,
  createRecipient,
  createGoal,
} from '../../testUtils';
import { findOrCreateResources, processActivityReportForResourcesById } from '../../services/resource';
import { createActivityReportObjectiveFileMetaData } from '../../services/files';
import { formatDeliveryMethod } from './deliveryMethod';
import { myReportsScopes } from './myReports';
import * as utils from '../utils';

// Mock users
export const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'user13706689',
  hsesUsername: 'user13706689',
  hsesUserId: 'user13706689',
  lastLogin: new Date(),
};

export const mockUserTwo = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'user137065478',
  hsesUsername: 'user137065478',
  hsesUserId: 'user137065478',
  lastLogin: new Date(),
};

export const mockManager = {
  id: faker.datatype.number(),
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
  requester: 'requester',
  targetPopulations: ['Children with Disabilities', 'Infants and Toddlers (ages birth to 3)'],
  reason: ['reason'],
  participants: ['participants'],
  topics: ['topics'],
  ttaType: ['type'],
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

// Shared test data
export const sharedTestData = {};

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

  sharedTestData.globallyExcludedReport = await ActivityReport.create({
    ...draftReport, deliveryMethod: 'method', updatedAt: '2000-01-01',
  }, {
    silent: true,
  });

  // Create roles if they don't exist
  const granteeSpecialist = await Role.findOne({ where: { fullName: 'Grantee Specialist' } });
  if (!granteeSpecialist) {
    await Role.create({ name: 'GS', fullName: 'Grantee Specialist', isSpecialist: true });
  }

  const systemSpecialist = await Role.findOne({ where: { fullName: 'System Specialist' } });
  if (!systemSpecialist) {
    await Role.create({ name: 'SS', fullName: 'System Specialist', isSpecialist: true });
  }

  const grantsSpecialist = await Role.findOne({ where: { fullName: 'Grants Specialist' } });
  if (!grantsSpecialist) {
    await Role.create({ name: 'GS', fullName: 'Grants Specialist', isSpecialist: true });
  }

  jest.spyOn(utils, 'getValidTopicsSet')
    .mockResolvedValue(validTopics);
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
  await ActivityReportApprover.destroy({ where: { activityReportId: ids }, force: true });
  await ActivityReport.unscoped().destroy({ where: { id: ids } });
  await User.destroy({
    where: {
      id: userIds,
    },
  });

  await db.sequelize.close();
}

// Re-export commonly used items
export const { sequelize } = db;
export {
  Op,
  filtersToScopes,
  ActivityReport,
  ActivityReportApprover,
  ActivityReportResource,
  ActivityRecipient,
  User,
  Recipient,
  Resource,
  Grant,
  ActivityReportCollaborator,
  OtherEntity,
  Program,
  Role,
  UserRole,
  Goal,
  Objective,
  ActivityReportObjective,
  ActivityReportObjectiveTopic,
  Topic,
  Group,
  GroupGrant,
  ActivityReportGoal,
  GoalTemplate,
  GoalTemplateFieldPrompt,
  GoalFieldResponse,
  ActivityReportGoalFieldResponse,
  GroupCollaborator,
  createReport,
  destroyReport,
  createGrant,
  createRecipient,
  createGoal,
  findOrCreateResources,
  processActivityReportForResourcesById,
  createActivityReportObjectiveFileMetaData,
  formatDeliveryMethod,
  myReportsScopes,
  REPORT_STATUSES,
  APPROVER_STATUSES,
  GOAL_STATUS,
  faker,
  auditLogger,
};
