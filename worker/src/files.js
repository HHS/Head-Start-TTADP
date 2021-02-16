const axios = require('axios');
const FormData = require('form-data');
const { downloadFile } = require('./s3');
const { File } = require('./models');

const fileStatuses = {
  uploading: 'UPLOADING',
  uploaded: 'UPLOADED',
  uploadFailed: 'UPLOAD_FAILED',
  queued: 'SCANNING_QUEUED',
  queueingFailed: 'QUEUEING_FAILED',
  scanning: 'SCANNING',
  approved: 'APPROVED',
  rejected: 'REJECTED',
};

const getIdFromKey = async (key) => {
  const file = await File.findOne({ where: { key } });
  return file.dataValues.id;
};

const updateFileStatus = async (key, fileStatus) => {
  const fileId = await getIdFromKey(key);
  await File.update({ status: fileStatus }, { where: { id: fileId } });
};

const processFile = (key) => downloadFile(key).then((data) => {
  const form = new FormData();
  form.append('name', key);
  form.append('file', data.Body, { filename: key, contentType: data.ContentType });
  return axios.post(`${process.env.CLAMAV_ENDPOINT}/scan`, form, { headers: { ...form.getHeaders() } })
    .then((res) => {
      updateFileStatus(key, fileStatuses.approved);
      return ({ status: res.status, data: res.data });
    })
    .catch((error) => {
      if (error.response.status === 406) {
        updateFileStatus(key, fileStatuses.rejected);
        return { status: error.response.status, data: error.response.data };
      }
      throw error;
    });
});

module.exports = {
  processFile,
};
