const axios = require('axios');
const FormData = require('form-data');
const https = require('https');
const { downloadFile } = require('../lib/s3');
const { File } = require('../models');

/**
 * ENUM Values from the Files.status column of the DB
 * @constant
 */
const fileStatuses = {
  UPLOADING: 'UPLOADING',
  UPLOADED: 'UPLOADED',
  UPLOAD_FAILED: 'UPLOAD_FAILED',
  QUEUED: 'SCANNING_QUEUED',
  QUEUEING_FAILED: 'QUEUEING_FAILED',
  SCANNING: 'SCANNING',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
};

Object.freeze(fileStatuses);

/**
 * Get's file Id from DB using the s3 key
 * @param {string} key - uuid with a file extension representing the s3 key of the file
 * @returns {number} File's Id
 */
const getIdFromKey = async (key) => {
  const file = await File.findOne({ where: { key } });
  return file.dataValues.id;
};

/**
 * @param {string} key - uuid with a file extension representing the s3 key of the file
 * @param {*} fileStatus - File status to be updated to. Should use fileStatuses const for statuses
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
    const data = await downloadFile(key);
    const form = new FormData();
    form.append('name', key);
    form.append('file', data.Body, { filename: key, contentType: data.ContentType });
    const agent = new https.Agent({ rejectUnauthorized: false });
    res = await axios.post(`${process.env.CLAMAV_ENDPOINT}/scan`, form, { httpsAgent: agent, headers: { ...form.getHeaders() } });
    await updateFileStatus(key, fileStatuses.APPROVED);
  } catch (error) {
    if (error.response.status === 406) {
      await updateFileStatus(key, fileStatuses.REJECTED);
      return { status: error.response.status, data: error.response.data };
    }
    throw error;
  }
  return ({ status: res.status, data: res.data });
};

module.exports = {
  processFile,
  fileStatuses,
};
