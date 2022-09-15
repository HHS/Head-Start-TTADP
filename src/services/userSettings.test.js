import { USER_SETTINGS } from '../constants';
import db, { User, UserSettingOverrides } from '../models';
import {
  getDefaultSettings,
  saveSettings,
  subscribeAll,
  unsubscribeAll,
  userEmailSettingsById,
  userSettingsById,
  usersWithSetting,
} from './userSettings';

describe('UserSetting service', () => {
  afterAll(async () => {
    await db.sequelize.close();
  });

  beforeEach(async () => {
    const ids = [999, 1000];
    const now = new Date();

    const create = () => Promise.all(ids.map(async (id) => {
      await User.create({
        id,
        name: `user ${id}`,
        email: `user${id}@test.gov`,
        hsesUsername: `user.${id}`,
        hsesUserId: id,
        createdAt: now,
        updatedAt: now,
      });

      await UserSettingOverrides.destroy({ where: { userId: [999, 1000] } });
    }));

    await create();
  });

  afterEach(async () => {
    await UserSettingOverrides.destroy({ where: { userId: [999, 1000] } });
    await User.destroy({ where: { id: [999, 1000] } });
  });

  describe('saveSettings', () => {
    const settings = [
      {
        key: USER_SETTINGS.EMAIL.KEYS.CHANGE_REQUESTED,
        value: USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY,
      },
      {
        key: USER_SETTINGS.EMAIL.KEYS.SUBMITTED_FOR_REVIEW,
        value: USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY,
      },
    ];

    it('saves the settings', async () => {
      const defaultSettings = await getDefaultSettings();
      const defs = Object.keys(defaultSettings).map((key) => ({
        key, value: defaultSettings[key].defaultValue,
      }));
      await saveSettings(999, settings);
      const found = await userSettingsById(999);

      const expected = defs.map((setting) => ({
        ...setting,
        ...settings.find((s) => s.key === setting.key),
      }));

      expect(found).toEqual(expected);
    });

    it('properly serializes', async () => {
      const setting = { key: USER_SETTINGS.EMAIL.KEYS.APPROVAL, value: { b: { c: 1 } } };
      await saveSettings(999, [setting]);
      const found = await usersWithSetting(setting.key, [setting.value]);
      expect(found.length).toEqual(1);
    });
  });

  describe('usersWithSettings', () => {
    it('returns the user(s) whose settings match the provided key/value - overrides', async () => {
      await subscribeAll(999);

      const k = USER_SETTINGS.EMAIL.KEYS.CHANGE_REQUESTED;
      const v = USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY;

      const users = await usersWithSetting(k, [v]);

      expect(users.length).toBe(1);
      expect(users[0].dataValues.id).toBe(999);
    });

    it('returns the user(s) whose settings match the provided key/value - defaults', async () => {
      await subscribeAll(999);
      await unsubscribeAll(1000);

      const k = USER_SETTINGS.EMAIL.KEYS.CHANGE_REQUESTED;
      const v = USER_SETTINGS.EMAIL.VALUES.NEVER;

      const users = await usersWithSetting(k, [v]);

      const ids = users.map(({ dataValues: { id } }) => id);
      expect(ids.includes(999)).toBe(false);
      expect(ids.includes(1000)).toBe(true);
    });
  });

  describe('userSettingsById', () => {
    it('retrieves the correct settings', async () => {
      const defaultSettings = await getDefaultSettings();
      const len = Object.keys(defaultSettings).length;
      const settings = await userSettingsById(999);
      expect(settings.length).toBe(len);
    });
  });

  describe('subscribeAll', () => {
    it('sets all email settings to immediate frequency', async () => {
      await subscribeAll(999);
      const found = await userSettingsById(999);
      const vals = new Set(found.map((s) => s.value));
      expect(vals.size).toBe(1);
      expect(vals.has(USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY)).toBe(true);
    });
  });

  describe('unsubscribeAll', () => {
    it('sets all email settings to never frequency', async () => {
      await unsubscribeAll(999);
      const found = await userSettingsById(999);
      const vals = new Set(found.map((s) => s.value));
      expect(vals.size).toBe(1);
      expect(vals.has(USER_SETTINGS.EMAIL.VALUES.NEVER)).toBe(true);
    });
  });

  describe('userEmailSettingsById', () => {
    it('retrieves the correct settings', async () => {
      const settings = [
        {
          key: USER_SETTINGS.EMAIL.KEYS.APPROVAL,
          value: USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY,
        },
        {
          key: USER_SETTINGS.EMAIL.KEYS.COLLABORATOR_ADDED,
          value: USER_SETTINGS.EMAIL.VALUES.DAILY_DIGEST,
        },
      ];
      await saveSettings(999, settings);
      const found = await userEmailSettingsById(999);
      const keys = new Set(found.map(({ dataValues: { key } }) => key));
      expect(keys.size).toBe(Object.keys(USER_SETTINGS.EMAIL.KEYS).length);
      Object.values(USER_SETTINGS.EMAIL.KEYS).forEach((key) => {
        expect(keys.has(key)).toBe(true);
      });
    });
  });
});
