import { Op } from 'sequelize';
import { USER_SETTINGS } from '../constants';
import {
  sequelize, User, UserSettings, UserSettingOverrides, UserValidationStatus,
  Permission,
} from '../models';
import SCOPES from '../middleware/scopeConstants';

const { SITE_ACCESS } = SCOPES;

const baseSearch = (userId) => ({
  attributes: [
    'key',
    [sequelize.fn('COALESCE', sequelize.col('"userSettingOverrides"."value"'), sequelize.col('"UserSettings"."default"')), 'value'],
  ],
  include: [
    {
      attributes: [],
      model: UserSettingOverrides,
      as: 'userSettingOverrides',
      where: { userId: { [Op.eq]: userId } },
      required: false,
    },
  ],
});

/**
 * Returns an object of all setting keys, their default values and their id.
 * @returns {Promise<{ [key]: { defaultValue: any, userSettingId: number, key: string }}}>}
 */
export const getDefaultSettings = async () => {
  const out = await UserSettings.findAll({});

  return out.map(({ dataValues: { key, default: defaultValue, id: userSettingId } }) => ({
    key, defaultValue, userSettingId,
  })).reduce((acc, { key, defaultValue, userSettingId }) => {
    acc[key] = { userSettingId, defaultValue, key };
    return acc;
  }, {});
};

/**
 * Given an array of { key, value } pairs, saves these settings to the database.
 * @param {number} userId
 * @param {{key: string, value: any}[]} pairs
 */
export const saveSettings = async (userId, pairs) => {
  const defaults = await getDefaultSettings();

  const save = pairs.reduce((acc, { key, value }) => {
    if (defaults[key] && defaults[key].defaultValue !== value) {
      return [...acc, { key, value, userSettingId: defaults[key].userSettingId }];
    }
    return acc;
  }, []);

  let updateable = await UserSettingOverrides.findAll({
    where: {
      userId,
      userSettingId: { [Op.in]: save.map(({ userSettingId }) => userSettingId) },
    },
  });

  updateable = updateable.map(({ dataValues: { id, userSettingId } }) => ({
    id,
    userSettingId,
  }));

  const insertable = save.filter(
    ({ userSettingId }) => !updateable.find(({ userSettingId: id }) => id === userSettingId),
  );

  const deletable = pairs.reduce((acc, { key, value }) => {
    if (defaults[key] && defaults[key].defaultValue === value) {
      return [...acc, { key, value, userSettingId: defaults[key].userSettingId }];
    }
    return acc;
  }, []);

  return Promise.all([
    // Overrides that have been given values that match the default
    // should be removed from the overrides table.
    ...deletable.map(({ userSettingId }) => UserSettingOverrides.destroy({
      where: { userId, userSettingId },
      individualHooks: true,
    })),

    // Overrides that have been given values that do not match the default
    // should be updated in the overrides table.
    ...updateable.map(({ userSettingId }) => UserSettingOverrides.update({
      value: sequelize.cast(JSON.stringify(save.find(({ userSettingId: id }) => id === userSettingId).value), 'jsonb'),
    }, {
      where: { userId, userSettingId },
    })),

    // Overrides that have been given values that do not match the default
    // and do not exist in the overrides table should be inserted into the
    // overrides table.
    ...insertable.map(({ value, userSettingId }) => UserSettingOverrides.create({
      userId,
      userSettingId,
      value: sequelize.cast(JSON.stringify(value), 'jsonb'),
    })),
  ]);
};

/**
 * userSettingsById returns all settings for a given user.
 *
 * @param {number} userId
 * @returns {Promise<{ key: string, value: unknown }[]>}
 */
export const userSettingsById = async (userId) => {
  const result = await UserSettings.findAll({
    ...baseSearch(userId),
  });

  return result.map(({ dataValues: { key, value } }) => ({ key, value }));
};

/**
 * Returns an array of all users with the given setting key&value.
 * @param {string} key the key of the setting to search for
 * @param {string[]} values the value of the setting to search for
 * @returns {Promise<User[]>}
 */
export const usersWithSetting = async (key, values) => {
  const defaults = await getDefaultSettings();
  const users = [];

  if (!Array.isArray(values)) {
    throw new Error(`usersWithSettings expected values array, got ${typeof values}`);
  }

  await Promise.all(values.map(async (v) => {
    let out;
    if (defaults[key] && defaults[key].defaultValue === v) {
      // this key, value pair is a default setting.
      // then return all users NOT providing an override for this key.
      out = await User.findAll({
        include: [
          {
            model: UserValidationStatus,
            as: 'validationStatus',
            attributes: ['id', 'type', 'validatedAt'],
          },
          {
            attributes: [],
            model: Permission,
            as: 'permissions',
            required: true,
          },
          {
            attributes: [],
            model: UserSettingOverrides,
            as: 'userSettingOverrides',
            include: [
              {
                attributes: [],
                model: UserSettings,
                as: 'setting',
                where: { key },
                required: true,
              },
            ],
            required: false,
          },
        ],
        where: { '$userSettingOverrides.id$': null },
        '$permissions.scopeId$': SITE_ACCESS,
      });
    } else {
      // this is an override.
      // return all users that are providing the override.
      out = await User.findAll({
        include: [
          {
            model: UserValidationStatus,
            as: 'validationStatus',
            attributes: ['id', 'type', 'validatedAt'],
          },
          {
            attributes: [],
            model: Permission,
            as: 'permissions',
            required: true,
          },
          {
            attributes: [],
            model: UserSettingOverrides,
            as: 'userSettingOverrides',
            include: [
              {
                attributes: [],
                model: UserSettings,
                as: 'setting',
                where: { key },
                required: true,
              },
            ],
            required: false,
            right: true,
          },
        ],
        where: {
          '$userSettingOverrides.setting.key$': { [Op.eq]: key },
          '$userSettingOverrides.value$': {
            [Op.eq]: sequelize.cast(JSON.stringify(v), 'jsonb'),
          },
          '$permissions.scopeId$': SITE_ACCESS,
        },
      });
    }

    users.push(...out);
  }));

  return users;
};

/**
 * userSettingOverridesById returns the key/value pair of the setting defined
 * by @param settingKey for the user defined by @param userId only if the value
 * is an override. If the value is the default value for that particular setting,
 * it will return undefined.
 *
 * @param {number} userId
 * @param {string} settingKey ("UserSettings"."key")
 * @returns {Promise<{key: string, value: any} | undefined>}
 */
export const userSettingOverridesById = async (userId, settingKey) => {
  const defaults = await getDefaultSettings();
  const result = await UserSettings.findAll({
    ...baseSearch(userId),
    where: { key: settingKey },
  });

  return result.map(({ dataValues: { key, value } }) => ({ key, value }))
    .filter(
      ({ key, value }) => !(defaults[key] && defaults[key].defaultValue === value),
    )[0];
};

// -----------------------------------------------------------------------------
// Email-setting-specific helpers:

/**
 * Returns all settings of class 'email' for a given user.
 * @param {number} userId
 * @returns {Promise<{ key: string, value: any}[]>}
 */
export const userEmailSettingsById = async (userId) => UserSettings.findAll({
  ...baseSearch(userId),
  where: { class: { [Op.eq]: 'email' } },
});

/**
 * @param {number} userId
 * @returns {Promise<unknown>}
 */
export const unsubscribeAll = async (userId) => {
  const settings = Object.values(USER_SETTINGS.EMAIL.KEYS).map((key) => ({
    key,
    value: USER_SETTINGS.EMAIL.VALUES.NEVER,
  }));

  return saveSettings(userId, settings);
};

/**
 * @param {number} userId
 * @returns {Promise<unknown>}
 */
export const subscribeAll = async (userId) => {
  const settings = Object.values(USER_SETTINGS.EMAIL.KEYS).map((key) => ({
    key,
    value: USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY,
  }));

  return saveSettings(userId, settings);
};
