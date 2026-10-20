import { faker } from '@faker-js/faker';
import { Op } from 'sequelize';
import { uniqueTestId } from '../../fakerUnique';
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
  id: uniqueTestId(),
  homeRegionId: 1,
  name: 'John Smith',
  hsesUsername: faker.string.sample(10),
  hsesUserId: faker.string.sample(10),
  lastLogin: new Date(),
};

export const mockCollaboratorUser = {
  id: uniqueTestId(),
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
