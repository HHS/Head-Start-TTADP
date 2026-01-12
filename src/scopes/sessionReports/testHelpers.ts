/* eslint-disable import/prefer-default-export */
import faker from '@faker-js/faker';

// Mock user data
export const mockUser = {
  id: faker.datatype.number(),
  homeRegionId: 1,
  name: 'Session Report Test User',
  hsesUsername: faker.datatype.string(10),
  hsesUserId: faker.datatype.string(10),
  lastLogin: new Date(),
};
