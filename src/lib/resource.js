/* eslint-disable import/prefer-default-export */
import axios from 'axios';
import { auditLogger, logger } from '../logger';
import { Resource } from '../models';

const getResourceMetaDataJob = async (job) => {
  const {
    resourceId, resourceUrl,
  } = job.data;
  try {
    // Use axios to get url info.
    const res = await axios.get(resourceUrl);

    // Get page title.
    const foundTitle = res.data.match(/<title[^>]*>([^<]+)<\/title>/);

    if (foundTitle && foundTitle.length >= 1) {
      // Get title.
      const titleToUpdate = foundTitle[1].trim();

      // update URL in DB.
      const updatedCount = await Resource.update({
        title: titleToUpdate,
      }, {
        where: { url: resourceUrl },
        individualHooks: false,
      });
    } else {
      auditLogger.info(`Resource Queue: Warning, unable to retrieve resource metadata for resource '${resourceUrl}'.`);
      return ({ status: 404, data: { url: resourceUrl } });
    }

    logger.info(`Resource Queue: Successfully retrieved resource metadata for resource '${resourceUrl}'`);

    return ({ status: 200, data: { url: resourceUrl } });
  } catch (error) {
    return { status: 500, data: {} };
  }
};

export {
  axios,
  getResourceMetaDataJob,
};
