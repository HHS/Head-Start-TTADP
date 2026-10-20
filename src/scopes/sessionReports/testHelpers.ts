/* eslint-disable import/prefer-default-export */
import { faker } from '@faker-js/faker';
import { uniqueTestId } from '../../fakerUnique';

// Mock user data
export const mockUser = {
  id: uniqueTestId(),
  homeRegionId: 1,
  name: 'Session Report Test User',
  hsesUsername: faker.string.sample(10),
  hsesUserId: faker.string.sample(10),
  lastLogin: new Date(),
};
