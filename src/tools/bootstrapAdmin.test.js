import bootstrapAdmin, { ADMIN_EMAIL } from './bootstrapAdmin';
import db, { User, Permission } from '../models';

describe('Bootstrap the first Admin user', () => {
  afterAll(() => {
    db.sequelize.close();
  });

  describe('when user already exists', () => {
    let user;
    beforeAll(async () => {
      [user] = await User.findOrCreate({ where: { email: ADMIN_EMAIL } });
    });
    afterEach(async () => {
      await Permission.destroy({ where: { userId: user.id } });
    });
    afterAll(async () => {
      await User.destroy({ where: { email: ADMIN_EMAIL } });
    });

    it('should create an admin and site access permission for the user', async () => {
      expect(user).toBeDefined();
      expect((await user.getPermissions()).length).toBe(0);
      const newPermissions = await bootstrapAdmin();
      expect(newPermissions.length).toBe(2);
      expect((await user.getPermissions()).length).toBe(2);
    });

    it('is idempotent', async () => {
      await bootstrapAdmin();
      expect((await user.getPermissions()).length).toBe(2);
      await bootstrapAdmin();
      expect((await user.getPermissions()).length).toBe(2);
    });
  });

  describe('when user does not exist', () => {
    it('should loudly exit', async () => {
      await expect(bootstrapAdmin()).rejects.toThrow(`User ${ADMIN_EMAIL} could not be found to bootstrap admin`);
    });
  });
});
