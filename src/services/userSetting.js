import { Op } from 'sequelize';
import { USER_SETTINGS } from '../constants';
import { UserSetting } from '../models';

/**
 * @param {UserSetting} setting
 * @param {any} value
 * @returns {Promise<UserSetting>}
 */
const saveSetting = (setting, value) => {
  setting.set('value', value);
  return setting.save();
};

/**
 * Given an array of { key, value } pairs, saves these settings to the database.
 * @param {number} userId
 * @param {{key: string, value: string}[]} pairs
 */
export const saveSettings = async (userId, pairs) => {
  const keys = pairs.map(({ key }) => key);
  const settings = await UserSetting.findAll({
    where: {
      userId: { [Op.eq]: userId },
      key: { [Op.in]: keys },
    },
  });

  return Promise.all(
    settings.map((setting) => {
      const { value } = pairs.find(({ key }) => key === setting.key);
      if (!value) return undefined;
      return saveSetting(setting, value);
    }),
  );
};

export const userSettingsById = async (userId) => UserSetting.findAll({
  where: { userId: { [Op.eq]: userId } },
});

// -----------------------------------------------------------------------------
// Email-setting-specific helpers:

/**
 * @param {number} userId
 * @returns {Promise<void>}
 */
export const userEmailSettingsById = async (userId) => UserSetting.findAll({
  where: {
    userId: { [Op.eq]: userId },
    key: { [Op.in]: Object.values(USER_SETTINGS.EMAIL.KEYS) },
  },
});

/**
 * @param {number} userId
 * @returns {Promise<void>}
 */
export const unsubscribeAll = async (userId) => {
  const settings = await userEmailSettingsById(userId);

  return Promise.all(
    settings.map((setting) => saveSetting(setting, USER_SETTINGS.EMAIL.VALUES.NEVER)),
  );
};

/**
 * @param {number} userId
 * @returns {Promise<void>}
 */
export const subscribeAll = async (userId) => {
  const settings = await userEmailSettingsById(userId);

  return Promise.all(
    settings.map((setting) => saveSetting(setting, USER_SETTINGS.EMAIL.VALUES.IMMEDIATELY)),
  );
};
