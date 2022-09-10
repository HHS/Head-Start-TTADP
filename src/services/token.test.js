import db, {
  User, UserValidationStatus,
} from '../models';
import { createAndStoreVerificationToken, validateVerificationToken } from './token';

describe('token service', () => {
  beforeEach(async () => {
    await User.create({
      id: 1000,
      name: 'user 1000',
      hsesUsername: 'user.1000',
      hsesUserId: '1000',
    });
  });

  afterEach(async () => {
    await UserValidationStatus.destroy({ where: { userId: 1000 } });
    await User.destroy({ where: { id: 1000 } });
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('createAndStoreVerificationToken', () => {
    it('creates a token', async () => {
      const token = await createAndStoreVerificationToken(1000, 'email');
      expect(token).toBeTruthy();

      const pair = await UserValidationStatus.findOne({
        where: {
          userId: 1000,
          type: 'email',
          token,
        },
      });

      expect(pair).toBeTruthy();
      expect(pair.dataValues.validatedAt).toBeNull();
    });
  });
  describe('validateVerificationToken', () => {
    it('validates a token', async () => {
      const token = await createAndStoreVerificationToken(1000, 'email');
      const payload = await validateVerificationToken(1000, token, 'email');
      expect(payload.userId).toBe(1000);
      expect(payload.type).toBe('email');

      const pair = await UserValidationStatus.findOne({
        where: {
          userId: 1000,
          type: 'email',
          token,
        },
      });

      expect(pair).toBeTruthy();
      expect(pair.dataValues.validatedAt).not.toBeNull();
    });
  });
});
