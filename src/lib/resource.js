import axios from 'axios';

const getResourceMetaDataJob = async (job) => {
  const {
    resourceId, resourceUrl,
  } = job.data;
  let res;
  try {
    res = {};
    return ({ status: 200, data: { resourceId, resourceUrl, res } });
  } catch (error) {
    return { data: job.data, status: res ? res.statusCode : 500, res: res || undefined };
  }
};

export {
  axios,
  getResourceMetaDataJob,
};
