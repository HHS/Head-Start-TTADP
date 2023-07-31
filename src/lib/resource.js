/* eslint-disable import/prefer-default-export */
import httpCodes from 'http-codes';
import axios from 'axios';
import { auditLogger, logger } from '../logger';
import { Resource } from '../models';

const getPageScrapeValues = async (resourceUrl) => {
  // Use axios to get url info.
  const res = await axios.get(resourceUrl, { maxRedirects: 3 });

  // Scrape Title.
  const foundTitle = res.data.match(/<title[^>]*>([^<]+)<\/title>/);

  // If we found a title update it.
  if (foundTitle && foundTitle.length >= 1) {
    // Get title.
    const titleToUpdate = foundTitle[1].trim();

    // Update db.
    const updatedCnt = await Resource.update({
      title: titleToUpdate,
    }, {
      where: { url: resourceUrl },
      individualHooks: false,
    });

    return updatedCnt && updatedCnt.length && updatedCnt[0];
  }

  return -1;
};

const getMetadataValues = async (resourceUrl) => {
  // Attempt to get the resource metadata (if valid ECLKC resource).
  // Sample: https://eclkc.ohs.acf.hhs.gov/mental-health/article/head-start-heals-campaign?_format=json
  const metadataUrl = `${resourceUrl}?_format=json`;
  const res = await axios.get(metadataUrl, { maxRedirects: 3 });
  const metadata = res.data;
  const { title } = metadata;

  // get field_taxonomy_national_centers.
  // eslint-disable-next-line max-len
  const fieldTaxonomyNationalCenters = metadata.field_taxonomy_national_centers;
  // get the field_taxonomy_topic.
  const fieldTaxonomyTopic = metadata.field_taxonomy_topic;

  // get the field_context.
  const fieldContext = metadata.field_context;

  // Create the metadata object.
  const metadataObj = {
    ...metadata,
    fieldTaxonomyNationalCenters,
    fieldTaxonomyTopic,
    fieldContext,
  };

  // Update URL in DB.
  await Resource.update({
    title: title && title.length ? title[0].value : null,
    metadata: metadataObj,
    metadataUpdatedAt: new Date(),
  }, {
    where: { url: resourceUrl },
    individualHooks: false,
    returning: true,
  });

  return title && title.length && title[0].value;
};

const getResourceMetaDataJob = async (job) => {
  const {
    resourceId, resourceUrl,
  } = job.data;

  try {
    // Determine if this is an ECLKC resource.
    const isEclkc = resourceUrl.includes('eclkc.ohs.acf.hhs.gov');

    let updatedCount;
    let titleRetrieved = false;

    if (isEclkc) {
      titleRetrieved = await getMetadataValues(resourceUrl);
    }

    // we've updated the title, so we are done
    if (titleRetrieved) {
      updatedCount = 1;
    }

    if (!titleRetrieved) {
      // Scrape page title for non-eclkc resource.
      updatedCount = await getPageScrapeValues(resourceUrl);

      if (updatedCount === -1) {
        return ({ status: httpCodes.NOT_FOUND, data: { url: resourceUrl } });
      }
      if (updatedCount === 0) {
        // We want to cause a retry.
        auditLogger.error(`Resource Queue: Warning, unable to retrieve resource TITLE for resource '${resourceUrl}'.`);
        throw Error('Failed to retrieve resource TITLE, attempting retry...');
      }
    }

    logger.info(`Resource Queue: Successfully retrieved resource metadata for resource '${resourceUrl}'`);
    return ({ status: httpCodes.OK, data: { url: resourceUrl } });
  } catch (error) {
    auditLogger.error(`Resource Queue: Unable to retrieve title for Resource (ID: ${resourceId} URL: ${resourceUrl}), please make sure this is a valid address:`, error);
    // Determine if max number of redirects has been exceeded if not retry.
    if (error.code !== 'ERR_FR_TOO_MANY_REDIRECTS') {
      throw Error(error); // We must rethrow the error here to ensure the job is retried.
    }
    return ({ status: httpCodes.BAD_REQUEST, data: { url: resourceUrl } });
  }
};

export {
  axios,
  getResourceMetaDataJob,
};
