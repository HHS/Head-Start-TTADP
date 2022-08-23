import jwt from 'jsonwebtoken';
import { UserValidationStatus } from '../models';

/**
 * createVerificationToken creates a JWT using
 * process.env.JWT_SECRET as the secret and the userId and type
 * as the payload. It stores the token in the `UserValidationStatus`
 * table along with the userId.
 * @param {number} userId - userId
 * @param {'email'|string} type - the type of verification,
 * stored in the payload to be verified later
 * @returns {string} - token
 */
export const createAndStoreVerificationToken = (userId, type) => {
  const secret = process.env.JWT_SECRET;
  const payload = { userId, type };
  const options = { expiresIn: '7d' };
  const token = jwt.sign(payload, secret, options);

  UserValidationStatus.create({ userId, token, type });

  return token;
};

/**
 * Given a userId and token, ensures:
 *  - this is a valid userId/token pair stored in the db.
 *  - the token signature can be verified.
 *  - the token is not expired.
 *  - the `type` in the token payload matches @param {string} type.
 * @param {number} userId - userId
 * @param {string} token - token
 * @param {'email'|string} type - type of verification
 * @throws {Error} - if any of the above checks fail
 * @returns {Promise<object>} - the payload of the token if all checks pass
 */
export const validateVerificationToken = async (userId, token, type) => {
  const pair = await UserValidationStatus.findOne({
    where: { userId, token, type },
  });

  if (!pair) {
    throw new Error('Invalid token pair');
  }

  if (pair.validatedAt) {
    throw new Error('Token already validated');
  }

  const secret = process.env.JWT_SECRET;
  const payload = jwt.verify(token, secret);

  if (payload.userId !== userId) {
    throw new Error('Invalid userId');
  }

  if (payload.type !== type) {
    throw new Error('Invalid type');
  }

  pair.set('validatedAt', new Date());
  await pair.save();

  return payload;
};
