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
  arsCreated: String(3),
  arsCollaboratedOn: String(4),
  ttaProvided: '10 days 5 hours',
  recipientsReached: String(1000),
  grantsServed: String(34),
  participantsReached: String(2344),
  goalsApproved: String(234),
  objectivesApproved: String(23),
});
