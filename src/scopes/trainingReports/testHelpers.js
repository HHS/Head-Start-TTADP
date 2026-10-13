import { faker } from '@faker-js/faker';
import { Op } from 'sequelize';
import {
  EventReportPilot,
  EventReportPilotNationalCenterUser,
  NationalCenter,
  NationalCenterUser,
  sequelize,
  User,
} from '../../models';
import filtersToScopes from '../index';

// Mock user data
export const mockUser = {
  id: faker.number.int({ min: 0, max: 99999 }),
  homeRegionId: 1,
  name: 'John Smith',
  hsesUsername: faker.string.sample(10),
  hsesUserId: faker.string.sample(10),
  lastLogin: new Date(),
};

export const mockCollaboratorUser = {
  id: faker.number.int({ min: 0, max: 99999 }),
  homeRegionId: 1,
  name: 'Bill Jones',
  hsesUsername: 'collabUser13874748',
  hsesUserId: 'collabUser13874748',
  lastLogin: new Date(),
};

// Re-export common imports for convenience
export {
  EventReportPilot,
  EventReportPilotNationalCenterUser,
  faker,
  filtersToScopes,
  NationalCenter,
  NationalCenterUser,
  Op,
  sequelize,
  User,
};
