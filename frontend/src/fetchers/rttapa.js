import join from 'url-join';
import { get, post } from './index';

const rttapaUrl = join('/', 'api', 'rttapa');

/**
 * @returns {Promise}
 */
export const getRttapas = async () => {
  const rttapas = await get(rttapaUrl);
  return rttapas.json();
};

/** *
 * @param {number} id
 * @returns {Promise}
 */
export const getRttapa = async (id) => {
  const rttapa = await get(join(rttapaUrl, String(id)));
  return rttapa.json();
};

/**
 *
 * @param {Object} data
 * @param {string} data.recipientId
 * @param {string} data.regionId
 * @param {string} data.reviewDate
 * @param {string} data.notes
 * @param {string} data.goalIds
 *
 * @returns {Promise}
 */
export const createRttapa = async (data) => {
  const rttapa = await post(rttapaUrl, data);
  return rttapa.json();
};
