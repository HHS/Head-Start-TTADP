import { Op } from 'sequelize';
import faker from '@faker-js/faker';
import filtersToScopes from '../index';

import {
  User,
  EventReportPilot,
  NationalCenterUser,
  NationalCenter,
  EventReportPilotNationalCenterUser,
  sequelize,
} from '../../models';

// Mock user data
export const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'John Smith',
  hsesUsername: faker.datatype.string(10),
  hsesUserId: faker.datatype.string(10),
  lastLogin: new Date(),
};

export const mockCollaboratorUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'Bill Jones',
  hsesUsername: 'collabUser13874748',
  hsesUserId: 'collabUser13874748',
  lastLogin: new Date(),
};

// Re-export common imports for convenience
export {
  Op,
  faker,
  filtersToScopes,
  User,
  EventReportPilot,
  NationalCenterUser,
  NationalCenter,
  EventReportPilotNationalCenterUser,
  sequelize,
};
