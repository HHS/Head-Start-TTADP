import join from 'url-join';
import { get, post } from './index';

export const getStateCodes = async () => {
  const res = await get(join('/', 'api', 'users', 'stateCodes'));
  return res.json();
};

export const requestVerificationEmail = async () => post(join('/', 'api', 'users', 'send-verification-email'));

export const verifyEmailToken = async (token) => {
  await post(join('/', 'api', 'users', 'verify-email', token));
};

// const res = await get(join('/', 'api', 'users', userId, 'statistics'));
// return res.json();
export const getStatistics = async (userId) => ({
  userId,
  daysSinceJoined: '123 days',
  arsCreated: 3,
  arsCollaboratedOn: 4,
  ttaProvided: '10 days 5 hours',
  recipientsReached: 1000,
  grantsServed: 34,
  participantsReached: 2344,
  goalsApproved: 234,
  objectivesApproved: 23,
});
