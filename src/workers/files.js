import axios from 'axios';
import FormData from 'form-data';
import https from 'https';
import { downloadFile } from '../lib/s3';
import { File } from '../models';
import { FILE_STATUSES } from '../constants';

const {
  SCANNING,
  SCANNING_FAILED,
  APPROVED,
  REJECTED,
} = FILE_STATUSES;

/**
 * Get's file Id from DB using the s3 key
 * @param {string} key - uuid with a file extension representing the s3 key of the file
 * @returns {Promise} File's Id
 */
const getIdFromKey = async (key) => {
  const file = await File.findOne({ where: { key } });
  return file.dataValues.id;
};

/**
 * @param {string} key - uuid with a file extension representing the s3 key of the file
 * @param {*} fileStatus - File status to be updated to. Should use FILE_STATUSES const for statuses
 */
const updateFileStatus = async (key, fileStatus) => {
  const fileId = await getIdFromKey(key);
  await File.update({ status: fileStatus }, { where: { id: fileId } });
};

/**
 * Downloads a file from  s3,
 * then calls the clamav rest api with the file and returns the results of the scan
 * @param {*} key - uuid with a file extension. The key is what defines the job in redis.
 * @return {object} - object with the file status and description
 * @throws throws an error if the http status code is not 200 (clean file) or 406 (dirty file)
 */
const processFile = async (key) => {
  let res;
  try {
    await updateFileStatus(key, SCANNING);
    const data = await downloadFile(key);
    const form = new FormData();
    form.append('name', key);
    form.append('file', data.Body, { filename: key, contentType: data.ContentType });
    const agent = new https.Agent({ rejectUnauthorized: false });
    res = await axios.post(`${process.env.CLAMAV_ENDPOINT}/scan`, form, {
      httpsAgent: agent,
      headers: { ...form.getHeaders() },
      // maxBodyLength: 30MB - matches MAX_FILE_SIZE on clamav application
      maxBodyLength: 31457280,
    });
    await updateFileStatus(key, APPROVED);
  } catch (error) {
    if (error.response && error.response.status === 406) {
      await updateFileStatus(key, REJECTED);
      return { status: error.response.status, data: error.response.data };
    }
    await updateFileStatus(key, SCANNING_FAILED);
    throw error;
  }
  return ({ status: res.status, data: res.data });
};

export default processFile;
