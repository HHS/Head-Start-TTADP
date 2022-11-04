import {} from 'dotenv/config';
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
 * @returns {Promise<string>} - token
 */

export const createAndStoreVerificationToken = async (userId, type) => {
  const secret = `${process.env.JWT_SECRET}`;
  const payload = { userId, type };
  const options = { expiresIn: '7d' };
  const token = jwt.sign(payload, secret, options);

  const row = await UserValidationStatus.findOne({ where: { userId, type } });

  if (row) {
    row.set('token', token);
    // If we're creating a new verification token, we likely also
    // want to ensure that the current validation status is null.
    row.set('validatedAt', null);
    row.save();

    return token;
  }

  await UserValidationStatus.create({ userId, token, type });
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

  const secret = `${process.env.JWT_SECRET}`;
  const payload = jwt.verify(token, secret);

  if (payload.userId !== userId) {
    throw new Error('Invalid userId');
  }

  if (payload.type !== type) {
    throw new Error('Invalid type');
  }

  // This token pair is already validated. This isn't an error, but
  // we don't want to update the `validatedAt` property. Just return the
  // payload. The UI will receive a 200 response and display a success message.
  if (pair.validatedAt) {
    return payload;
  }

  pair.set('validatedAt', new Date());
  await pair.save();

  return payload;
};
