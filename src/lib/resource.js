/* eslint-disable import/prefer-default-export */
import httpCodes from 'http-codes';
import axios from 'axios';
import { auditLogger, logger } from '../logger';
import { Resource } from '../models';

const getPageScrapeValues = async (resourceUrl, isEclkc) => {
  // Use axios to get url info.
  const res = await axios.get(resourceUrl, { maxRedirects: 3 });

  // Scrape Title & National Centers from ECLKC resources.
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

    // If we don't update anything throw an error to retry.
    if (updatedCnt[0] === 0) {
      throw Error('Failed to update db resource.');
    }

    return updatedCnt[0];
  }

  return 0;
};

const getMetadataValues = async (resourceId, resourceUrl) => {
  // Attempt to get the resource metadata (if valid ECLKC resource).
  // Sample: https://eclkc.ohs.acf.hhs.gov/mental-health/article/head-start-heals-campaign?_format=json
  try {
    const metadataUrl = `${resourceUrl}?_format=json`;
    const res = await axios.get(metadataUrl, { maxRedirects: 3 });
    const metadata = res.data;

    // get created.
    const { created } = metadata;
    // get changed.
    const { changed } = metadata;
    // get title.
    const { title } = metadata;
    // get field_taxonomy_national_centers.
    // eslint-disable-next-line max-len
    const fieldTaxonomyNationalCenters = metadata.field_taxonomy_national_centers;
    // get the field_taxonomy_topic.
    const fieldTaxonomyTopic = metadata.field_taxonomy_topic;
    // get the langcode.
    const { langcode } = metadata;
    // get the field_context.
    const fieldContext = metadata.field_context;

    // Create the metadata object.
    const metadataObj = {
      created,
      changed,
      title,
      fieldTaxonomyNationalCenters,
      fieldTaxonomyTopic,
      langcode,
      fieldContext,
    };

    // Update URL in DB.
    await Resource.update({
      metadata: metadataObj,
      metadataUpdatedAt: new Date(),
    }, {
      where: { url: resourceUrl },
      individualHooks: false,
    });
  } catch (error) {
    auditLogger.error(`Resource Queue: Unable to retrieve ECLKC metadata for Resource (ID: ${resourceId} URL: ${resourceUrl}).`, error);
  }
};

const getResourceMetaDataJob = async (job) => {
  const {
    resourceId, resourceUrl,
  } = job.data;

  try {
    // 1.) Determine if this is an ECLKC resource.
    const isEclkc = resourceUrl.includes('eclkc.ohs.acf.hhs.gov');

    // 2.) Scrape page title for all pages.
    const updated = await getPageScrapeValues(resourceUrl, isEclkc);
    if (updated === 0) {
      // We want to cause a retry.
      auditLogger.info(`Resource Queue: Warning, unable to retrieve resource title for resource '${resourceUrl}'.`);
      return ({ status: httpCodes.NOT_FOUND, data: { url: resourceUrl } });
    }

    // 3.) Get metadata (if ECLKC resource).
    if (isEclkc) {
      await getMetadataValues(resourceId, resourceUrl);
    } else {
      auditLogger.info(`Resource Queue: Warning, not a ECLKC resource SKIPPING metadata collection for: '${resourceUrl}'.`);
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
