import axios from 'axios';
import { Resource } from '../models';
import { auditLogger, logger } from '../logger';

const processResourceInfo = async (job) => {
  const { url } = job.data;
  let res;
  try {
    // Use axios to get url info.
    res = await axios.get(url);

    // Get page title.
    const foundTitle = res.data.match(/<title[^>]*>([^<]+)<\/title>/);

    if (foundTitle && foundTitle.length >= 1) {
      // Get title.
      const titleToUpdate = foundTitle[1];

      // update URL in DB.
      await Resource.update({
        title: titleToUpdate,
      }, {
        where: { url },
        individualHooks: false,
      });
    } else {
      auditLogger.info(`Resource Queue: Warning, unable to retrieve resource metadata for resource '${url}'.`);
      return ({ status: res.status, data: { url } });
    }
  } catch (error) {
    auditLogger.error(`Resource Queue: Error, unable to retrieve resource metadata for resource '${url}': ${error.message}`);
    return { status: 500, data: error.message };
  }
  logger.info(`Resource Queue: Successfully retrieved resource metadata for resource '${url}'`);
  return ({ status: res.status, data: res.data });
};

export {
  axios,
  processResourceInfo,
};
