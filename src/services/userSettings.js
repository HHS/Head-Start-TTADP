import { Op } from 'sequelize';
import { USER_SETTINGS } from '../constants';
import {
  sequelize, User, UserSettings, UserSettingOverrides,
} from '../models';

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

  const del = pairs.reduce((acc, { key, value }) => {
    if (defaults[key] && defaults[key].defaultValue === value) {
      return [...acc, { key, value, userSettingId: defaults[key].userSettingId }];
    }
    return acc;
  }, []);

  const settingIds = del.map(({ userSettingId }) => userSettingId)
    .concat(save.map(({ userSettingId }) => userSettingId));

  return Promise.all([
    UserSettingOverrides.destroy({ where: { userId, userSettingId: { [Op.in]: settingIds } } }),
    UserSettingOverrides.bulkCreate(save.map(({ userSettingId, value }) => ({
      userId,
      userSettingId,
      value: sequelize.cast(JSON.stringify(value), 'jsonb'),
    }))),
  ]);
};

export const userSettingsById = async (userId) => {
  const result = await UserSettings.findAll({
    ...baseSearch(userId),
  });

  return result.map(({ dataValues: { key, value } }) => ({ key, value }));
};

/**
 * Returns an array of all users with the given setting key&value.
 * @param {string} key the key of the setting to search for
 * @param {any} value the value of the setting to search for
 * @returns {Promise<User[]>}
 */
export const usersWithSetting = async (key, value) => {
  const defaults = await getDefaultSettings();

  if (defaults[key] && defaults[key].defaultValue === value) {
    // this key, value pair is a default setting.
    // then return all users NOT providing an override for this key.
    return User.findAll({
      include: [
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
    });
  }

  // this is an override.
  // return all users that are providing the override.
  return User.findAll({
    include: [
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
      '$userSettingOverrides.value$': { [Op.eq]: sequelize.cast(JSON.stringify(value), 'jsonb') },
    },
  });
};

// -----------------------------------------------------------------------------
// Email-setting-specific helpers:

/**
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
