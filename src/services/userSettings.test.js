import { USER_SETTINGS } from '../constants';
import db, { User, UserSettingOverrides, Permission } from '../models';
import {
  getDefaultSettings,
  saveSettings,
  subscribeAll,
  unsubscribeAll,
  userEmailSettingsById,
  userSettingOverridesById,
  userSettingsById,
  usersWithSetting,
} from './userSettings';

import SCOPES from '../middleware/scopeConstants';

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
        lastLogin: new Date(),
      });
      await Permission.create({
        userId: id,
        regionId: 14,
        scopeId: SCOPES.SITE_ACCESS,
      });

      await UserSettingOverrides.destroy({ where: { userId: [999, 1000] } });
    }));

    await create();
  });

  afterEach(async () => {
    await UserSettingOverrides.destroy({ where: { userId: [999, 1000] } });
    await Permission.destroy({ where: { userId: [999, 1000] } });
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

    it('properly inserts overrides', async () => {
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

      const foundSorted = found.sort((a, b) => a.key.localeCompare(b.key));
      const expectedSorted = expected.sort((a, b) => a.key.localeCompare(b.key));

      expect(foundSorted).toEqual(expectedSorted);
    });

    it('properly updates an override', async () => {
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

      const newSettings = [
        {
          key: USER_SETTINGS.EMAIL.KEYS.CHANGE_REQUESTED,
          value: USER_SETTINGS.EMAIL.VALUES.DAILY_DIGEST,
        },
        {
          key: USER_SETTINGS.EMAIL.KEYS.SUBMITTED_FOR_REVIEW,
          value: USER_SETTINGS.EMAIL.VALUES.WEEKLY_DIGEST,
        },
      ];

      await saveSettings(999, newSettings);
      const found2 = await userSettingsById(999);

      const expected2 = defs.map((setting) => ({
        ...setting,
        ...newSettings.find((s) => s.key === setting.key),
      }));

      expect(found2).toEqual(expected2);
    });

    it('properly deletes an override', async () => {
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

      const newSettings = [
        {
          key: USER_SETTINGS.EMAIL.KEYS.CHANGE_REQUESTED,
          value: USER_SETTINGS.EMAIL.VALUES.NEVER,
        },
        {
          key: USER_SETTINGS.EMAIL.KEYS.SUBMITTED_FOR_REVIEW,
          value: USER_SETTINGS.EMAIL.VALUES.NEVER,
        },
      ];

      await saveSettings(999, newSettings);
      const found2 = await userSettingsById(999);

      expect(found2).toEqual(defs);
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

    it('provides validationStatus - overrides', async () => {
      await subscribeAll(999);

      const k = USER_SETTINGS.EMAIL.KEYS.CHANGE_REQUESTED;
      const v = USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY;

      const users = await usersWithSetting(k, [v]);

      expect(users.length).toBe(1);
      expect(users[0].dataValues.validationStatus).not.toBeNull();
    });

    it('provides validationStatus - defaults', async () => {
      await subscribeAll(999);
      await unsubscribeAll(1000);

      const k = USER_SETTINGS.EMAIL.KEYS.CHANGE_REQUESTED;
      const v = USER_SETTINGS.EMAIL.VALUES.NEVER;

      const users = await usersWithSetting(k, [v]);

      expect(users[0].dataValues.validationStatus).not.toBeNull();
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

  describe('userSettingOverridesById', () => {
    it('returns the value when there\'s an override', async () => {
      const setting = [
        {
          key: USER_SETTINGS.EMAIL.KEYS.COLLABORATOR_ADDED,
          value: USER_SETTINGS.EMAIL.VALUES.DAILY_DIGEST,
        },
      ];
      await saveSettings(999, setting);
      const found = await userSettingOverridesById(
        999,
        USER_SETTINGS.EMAIL.KEYS.COLLABORATOR_ADDED,
      );
      expect(found).toEqual(setting[0]);
    });

    it('returns undefined when there\'s no override', async () => {
      const found = await userSettingOverridesById(
        999,
        USER_SETTINGS.EMAIL.KEYS.COLLABORATOR_ADDED,
      );
      expect(found).toBeUndefined();
    });
  });
});
