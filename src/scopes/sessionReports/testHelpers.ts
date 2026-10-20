/* eslint-disable import/prefer-default-export */
import { faker } from '@faker-js/faker';

// Mock user data
export const mockUser = {
  id: faker.number.int({ min: 0, max: 99999 }),
  homeRegionId: 1,
  name: 'Session Report Test User',
  hsesUsername: faker.string.sample(10),
  hsesUserId: faker.string.sample(10),
  lastLogin: new Date(),
};
