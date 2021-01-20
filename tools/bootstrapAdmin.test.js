import bootstrapAdmin, { ADMIN_EMAIL } from './bootstrapAdmin';
import db, { User } from '../src/models';

describe('Bootstrap the first Admin user', () => {
  afterAll(() => {
    db.sequelize.close();
  });

  describe('when user already exists', () => {
    beforeAll(async () => {
      await User.findOrCreate({ where: { email: ADMIN_EMAIL } });
    });
    afterAll(async () => {
      await User.destroy({ where: { email: ADMIN_EMAIL } });
    });

    it('should create an admin permission for the user', async () => {
      const user = await User.findOne({ where: { email: ADMIN_EMAIL } });
      expect(user).toBeDefined();
      expect((await user.getPermissions()).length).toBe(0);
      const newPermission = await bootstrapAdmin();
      expect(newPermission).toBeDefined();
      expect((await user.getPermissions()).length).toBe(1);
      await newPermission.destroy();
    });

    it('is idempotent', async () => {
      const permission = await bootstrapAdmin();
      const secondRun = await bootstrapAdmin();
      expect(secondRun.id).toBe(permission.id);
      await permission.destroy();
    });
  });

  describe('when user does not exist', () => {
    it('should loudly exit', async () => {
      await expect(bootstrapAdmin()).rejects.toThrow(`User ${ADMIN_EMAIL} could not be found to bootstrap admin`);
    });
  });
});
