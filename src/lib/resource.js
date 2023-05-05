/* eslint-disable import/prefer-default-export */
import httpCodes from 'http-codes';
import axios from 'axios';
import { auditLogger, logger } from '../logger';
import { Resource } from '../models';

const getResourceMetaDataJob = async (job) => {
  const {
    resourceId, resourceUrl,
  } = job.data;
  let res;
  try {
    // Use axios to get url info.
    res = await axios.get(resourceUrl, { maxRedirects: 10 });

    // Get page title.
    const foundTitle = res.data.match(/<title[^>]*>([^<]+)<\/title>/);

    // If we found a title, update the resource.
    if (foundTitle && foundTitle.length >= 1) {
      // Get title.
      const titleToUpdate = foundTitle[1].trim();

      // Update URL in DB.
      const updatedCnt = await Resource.update({
        title: titleToUpdate,
      }, {
        where: { url: resourceUrl },
        individualHooks: false,
      });

      // If we don't update anything throw an error to retry.
      if (updatedCnt[0] === 0) {
        throw Error('Failed to update resource title.');
      }
    } else {
      auditLogger.info(`Resource Queue: Warning, unable to retrieve resource metadata for resource '${resourceUrl}'.`);
      return ({ status: httpCodes.NOT_FOUND, data: { url: resourceUrl } });
    }
    logger.info(`Resource Queue: Successfully retrieved resource metadata for resource '${resourceUrl}'`);
    return ({ status: httpCodes.OK, data: { url: resourceUrl } });
  } catch (error) {
    auditLogger.error(`Resource Queue: Unable to retrieve title for Resource (ID: ${resourceId} URL: ${resourceUrl}), please make sure this is a valid address:`, error);
    throw Error(error); // We must rethrow the error here to ensure the job is retried.
  }
};

export {
  axios,
  getResourceMetaDataJob,
};
