const axios = require('axios');
const FormData = require('form-data');
const { downloadFile } = require('./s3');

const processFile = (key) => downloadFile(key).then((data) => {
  const form = new FormData();
  form.append('name', key);
  form.append('file', data.Body, { filename: key, contentType: data.ContentType });
  return axios.post(`${process.env.CLAMAV_ENDPOINT}/scan`, form, { headers: { ...form.getHeaders() } })
    .then((res) => res.data);
});

module.exports = {
  processFile,
};
