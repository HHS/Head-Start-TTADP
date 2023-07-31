/* eslint-disable import/prefer-default-export */
import httpCodes from 'http-codes';
import axios from 'axios';
import he from 'he';
import { auditLogger, logger } from '../logger';
import { Resource } from '../models';

const requestOptions = {
  maxRedirects: 25,
  responseEncoding: 'utf8',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
};

/**
 * Filters an object by converting all string values to a supported character set.
 *
 * @param {object} obj - The object to filter.
 * @returns {object} - The filtered object.
 */
const filterToSupportedCharacters = (obj) => JSON.parse(JSON.stringify(obj, (key, value) => {
  if (typeof value === 'string') {
    return Buffer.from(value, 'utf-8').toString();
  }
  return value;
}));

const commonAuthNames = [
  'login',
  'signin',
  'authenticate',
  'unavailable',
  'auth',
];

/**
 * Overrides the status code to UNAUTHORIZED if authentication is required.
 * @param {number} statusCode - The original status code.
 * @param {Array<string>} list - The list of common authentication names.
 * @param {string} data - The data to check for common authentication names.
 * @param {boolean} filtered - Indicates whether the list is filtered or not. Default is false.
 * @returns {number} - The updated status code.
 */
const overrideStatusCodeOnAuthRequired = (statusCode, list, data, filtered = false) => {
  // Check if authentication is required based on the list and data
  const requiresAuth = list
    .filter((commonAuthName) => !(filtered || commonAuthName === 'auth'))
    .some((commonAuthName) => data && data?.includes(commonAuthName));

  // If authentication is required and the original status code is OK, return UNAUTHORIZED
  if (statusCode === httpCodes.OK && requiresAuth) {
    return httpCodes.UNAUTHORIZED;
  }

  // Otherwise, return the original status code
  return statusCode;
}

/**
 * Retrieves the MIME type and status code of a resource from a given URL.
 *
 * @param {string} url - The URL of the resource.
 * @returns {Promise<Object>} - An object containing the MIME type and status code.
 */
const getMimeType = async (url) => {
  let mimeType; // Variable to store the MIME type of the resource.
  let statusCode; // Variable to store the status code of the resource.

  try {
    const res = await axios.head(url, requestOptions); // Send a HEAD request to the URL and get the response.
    mimeType = res.headers['content-type']; // Extract the MIME type from the response headers.
    const redirectedUrl = res.request.res.responseUrl !== url && res.request.res.responseUrl; // Check if the URL was redirected and get the redirected URL if applicable.
    statusCode = overrideStatusCodeOnAuthRequired(res.status, commonAuthNames, redirectedUrl); // Override the status code if authentication is required.

  } catch (error) {
    if (error.response && error.response.status) {
      statusCode = error.response.status; // Get the status code from the error response.
      mimeType = error.response.headers['content-type']; // Get the MIME type from the error response headers.
      auditLogger.error(
        `Resource Queue: Unable to retrieve header for Resource (URL: ${url}), received status code of ${statusCode}. Please make sure this is a valid address:`,
        error,
        process.pid
      ); // Log an error message with the URL and status code.
    } else {
      auditLogger.error('Error checking status:', error); // Log a generic error message.
    }
  }

  // Update URL in DB.
  await Resource.update({
    ...(mimeType && { mimeType }), // Update the MIME type in the database if it exists.
    ...(statusCode && { lastStatusCode: statusCode}), // Update the status code in the database if it exists.
  }, {
    where: { url },
    individualHooks: true,
  });

  return { mimeType, statusCode }; // Return the MIME type and status code as an object.
};

/**
 * Retrieves metadata values from a JSON resource.
 *
 * @param {string} url - The URL of the resource.
 * @returns {Promise<Object>} - A promise that resolves to an object containing the metadata, status code, and MIME type of the resource.
 */
const getMetadataValuesFormJson = async (url) => {
  let result;
  try {
    // Attempt to get the resource metadata (if valid ECLKC resource).
    // Sample: https://eclkc.ohs.acf.hhs.gov/mental-health/article/head-start-heals-campaign?_format=json

    let metadataUrl;

    // Check if the URL already contains query parameters
    if (url.includes('?')) {
      metadataUrl = `${url}&_format=json`;
    }
    // Check if the URL contains a fragment identifier
    else if (url.includes('#')) {
      metadataUrl = `${url.split('#')[0]}?_format=json`;
    }
    // Append query parameter to the URL
    else {
      metadataUrl = `${url}?_format=json`;
    }

    const res = await axios.get(metadataUrl, requestOptions);

    result = {
      // Check if the response data is a non-empty object and the content-type is JSON
      metadata: (typeof res.data === 'object' && Object.keys(res.data).length !== 0 && res.headers['content-type'] === 'application/json')
        ? res.data
        : null,
      statusCode: overrideStatusCodeOnAuthRequired(
        res.status,
        commonAuthNames,
        res.request.res.responseUrl !== metadataUrl && res.request.res.responseUrl,
        true,
      ),
      mimeType: res.headers['content-type'],
    };
  } catch (error) {
    if (error.response) {
      auditLogger.error(
        `Resource Queue: Unable to collect metadata from json for Resource (URL: ${url}), received status code of ${error.response.status}. Please make sure this is a valid address:`,
        error, process.pid
      );
      result = {
        metadata: null,
        statusCode: error.response.status,
        mimeType: error?.response?.headers['content-type'],
      }
    } else {
      auditLogger.error(
        `Resource Queue: Unable to collect metadata from json for Resource (URL: ${url}). Please make sure this is a valid address:`,
        error, process.pid
      );
      throw error;
    }
  }
  return result;
}

const metadataPatterns = [
  /<(title)[^>]*>([^<]+)<\/title>/gi,
  /<meta[ \t]+(?:name|property)="([^"]*)"[ \t]+content="([^"]*)"[ \t]?(?:[\/])?>/gi,
];
/**
 * Retrieves metadata values from an HTML page.
 *
 * @param {string} url - The URL of the HTML page.
 * @returns {Promise<object>} - An object containing the metadata, status code, and MIME type.
 */
const getMetadataValuesFormHtml = async (url) => {
  let result;
  try {
    // Make a GET request to the specified URL
    const res = await axios.get(url, requestOptions);

    // Extract metadata values from the HTML response
    let metadata = metadataPatterns
      .flatMap((pattern) => (res && res.data && typeof res.data === 'string')
        ? [...(res.data.matchAll(pattern))]
        : [])
      .reduce((acc, meta) => {
        if (Array.isArray(meta)) {
          const key = meta[1].toLowerCase();
          const value = meta[2].trim();
          if (value && value !== '') {
            if (acc[key]) {
              if (Array.isArray(acc[key])) {
                acc[key].push(value);
              } else {
                acc[key] = [acc[key], value];
              }
            } else {
              acc[key] = value;
            }
          }
        }
        return acc;
      }, {});

    // Prepare the result object
    result = {
      metadata: (typeof metadata === 'object' && Object.keys(metadata).length !== 0)
        ? metadata
        : null,
      statusCode: overrideStatusCodeOnAuthRequired(
        res.status,
        commonAuthNames,
        res.request.res.responseUrl !== url && res.request.res.responseUrl,
        true,
      ),
      mimeType: res.headers['content-type'],
    };
  } catch (error) {
    if (error.response) {
      // Log an error message when unable to collect metadata due to a response error
      auditLogger.error(
        `Resource Queue: Unable to collect metadata from page scrape for Resource (URL: ${url}), received status code of ${error.response.status}. Please make sure this is a valid address:`,
        error,process.pid
      );
      result = {
        statusCode: error.response.status,
        mimeType: error?.response?.headers['content-type'],
      }
    } else {
      // Log an error message when unable to collect metadata due to an unexpected error
      auditLogger.error(
        `Resource Queue: Unable to collect metadata from page scrape for Resource (URL: ${url}). Please make sure this is a valid address:`,
        error,process.pid
      );
      throw error;
    }
  }

  return result;
}
/**
 * Retrieves metadata values for a given URL.
 * @param {string} url - The URL to retrieve metadata from.
 * @returns {Promise<{ title: string | null, statusCode: number }>} - The title and status code of the resource.
 */
const getMetadataValues = async (url) => {
  let statusCode; // Variable to store the status code of the resource.
  let metadata; // Variable to store the metadata of the resource.
  let title = null; // Variable to store the title of the resource, initialized as null.
  let mimeType; // Variable to store the MIME type of the resource.

  try {
    const [
      fromJson,
      fromHtml,
    ] = await Promise.allSettled([
      await getMetadataValuesFormJson(url), // Retrieve metadata values from JSON format.
      await getMetadataValuesFormHtml(url), // Retrieve metadata values from HTML format.
    ]);

    const { metadata: metadataFromJson, statusCode: statuscodeFromJson } = fromJson.value; // Destructure metadata and status code from JSON result.
    const { metadata: metadataFromHtml, statusCode: statuscodeFromHtml, mimeType: mimeTypeFromHtml } = fromHtml.value; // Destructure metadata, status code, and MIME type from HTML result.

    metadata = filterToSupportedCharacters({
      ...metadataFromJson,
      ...metadataFromHtml,
    }); // Combine metadata from JSON and HTML formats and filter out unsupported characters.
    metadata = Object.keys(metadata).length !== 0 && metadata || null; // If metadata is not empty, assign it to the variable, otherwise assign null.
    statusCode = Math.min(statuscodeFromJson, statuscodeFromHtml); // Assign the minimum status code between JSON and HTML results.
    mimeType = mimeTypeFromHtml; // Assign the MIME type from HTML result.

    if (metadata) {
      if (metadata.title) {
        if (Array.isArray(metadata.title)) {
          title = metadata.title[0].value; // If title is an array, assign the first value to the variable.
        } else {
          title = metadata.title; // If title is not an array, assign it directly to the variable.
        }
      } else if (metadata['og:title']) {
        title = metadata['og:title']; // If title is not available but 'og:title' exists in metadata, assign it to the variable.
      }
      title = he.decode(decodeURIComponent(title)) || null; // Decode and decode URI component of the title, assign it to the variable, or assign null if undefined.
      title = title !== 'undefined' ? title : null; // Assign null to the variable if the title is 'undefined'.
    }
  } catch (error) {
    auditLogger.error(
      `Resource Queue: Unable to retrieving metadata for Resource (URL: ${url}). Please make sure this is a valid address:`,
      error,error.stack, error.toString()
    ); // Log an error message if there is an exception while retrieving metadata.
  }

  await Resource.update({
    ...(title && { title }), // Update the title field in the database if it exists.
    ...(metadata && { metadata, metadataUpdatedAt: new Date() }), // Update the metadata and metadataUpdatedAt fields in the database if they exist.
    ...(mimeType && { mimeType }), // Update the mimeType field in the database if it exists.
    ...(statusCode && { lastStatusCode: statusCode }), // Update the lastStatusCode field in the database if it exists.
    metadataUpdatedAt: new Date(), // Update the metadataUpdatedAt field in the database with the current date.
  }, {
    where: { url }, // Specify the resource to update based on the URL.
    individualHooks: true, // Enable individual hooks for the update operation.
  });

  return {
    title,
    statusCode,
  }; // Return the title and status code of the resource.
};

/**
 * Retrieves metadata values and updates a resource with the scraped data.
 *
 * @param {string} url - The URL of the resource to scrape.
 * @returns {Promise<Object>} - An object containing the scraped title and status code.
 */
const getPageScrapeValues = async (url) => {
  let statusCode; // Variable to store the status code of the HTTP response
  let metadata; // Variable to store the metadata of the HTML page
  let mimeType; // Variable to store the MIME type of the HTML page
  let title = null; // Variable to store the extracted title from the metadata

  try {
    // Call the getMetadataValuesFormHtml function and destructure the returned values
    ({ metadata, statusCode, mimeType } = await getMetadataValuesFormHtml(url));

    if (metadata) {
      if (metadata.title) {
        title = metadata.title; // Extract the title from the metadata if it exists
      }
      if (!title && metadata['og:title']) {
        title = metadata['og:title']; // Extract the Open Graph title from the metadata if title is not found
      }
      title = title && he.decode(decodeURIComponent(title)) || null; // Decode and sanitize the title
      title = title !== 'undefined' ? title : null; // Set title to null if it is undefined
    }
  } catch (error) {
    auditLogger.error(
      `Resource Queue: Unable to page scrape for Resource (URL: ${url}). Please make sure this is a valid address:`,
      error, process.pid
    );
    throw error; // Rethrow the error to be handled by the caller
  }

  // Update the resource with the scraped data
  await Resource.update({
    ...(title && { title }), // Update the title if it exists
    ...(metadata && { metadata, metadataUpdatedAt: new Date() }), // Update the metadata and metadataUpdatedAt if they exist
    ...(mimeType && { mimeType }), // Update the MIME type if it exists
    ...(statusCode && { lastStatusCode: statusCode }), // Update the last status code if it exists
  }, {
    where: { url },
    individualHooks: true,
  });

  return { title, statusCode }; // Return the scraped title and status code
};

export const unparsableMimeTypes = [
  'application/octet-stream',
  'application/pdf',
  'application/pdf;charset=utf-8',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'audio/mpeg',
  'image/jpeg',
  'image/png',
  'video/mp4',
];

/**
 * Retrieves metadata for a given resource.
 *
 * @param {object} job - The job object containing the resourceId and resourceUrl.
 * @returns {object} - The status and data of the retrieved resource metadata.
 */
const getResourceMetaDataJob = async (job) => {
  const {
    resourceId, resourceUrl,
  } = job.data;

  try {
    // Determine if this is an ECLKC resource.
    const isEclkc = resourceUrl.includes('eclkc.ohs.acf.hhs.gov');

    let statusCode;
    let mimeType;

    // Get the MIME type and status code of the resource.
    ({ mimeType, statusCode } = await getMimeType(resourceUrl));

    // Check if the MIME type is unparsable.
    if (mimeType && unparsableMimeTypes.includes(mimeType.toLowerCase().replace(/\s+/g, ''))) {
      auditLogger.error(`Resource Queue: Warning, unable to process resource '${resourceUrl}', received status code '${statusCode}'.`);
      return { status: httpCodes.NO_CONTENT, data: { url: resourceUrl } };
    }

    // Check if the status code indicates an error.
    if (statusCode !== httpCodes.OK) {
      auditLogger.error(`Resource Queue: Warning, unable to retrieve resource '${resourceUrl}', received status code '${statusCode}'.`);
      return { status: statusCode, data: { url: resourceUrl } };
    }

    // If it is an ECLKC resource, get the metadata values.
    if (isEclkc) {
      ({ title, statusCode } = await getMetadataValues(resourceUrl));
      if (statusCode !== httpCodes.OK) {
        auditLogger.error(`Resource Queue: Warning, unable to retrieve metadata or resource TITLE for resource '${resourceUrl}', received status code '${statusCode}'.`);
        return { status: statusCode, data: { url: resourceUrl } };
      }
    } else {
      // If it is not an ECLKC resource, scrape the page title.
      ({ title, statusCode } = await getPageScrapeValues(resourceUrl));
      if (statusCode !== httpCodes.OK) {
        auditLogger.error(`Resource Queue: Warning, unable to retrieve resource TITLE for resource '${resourceUrl}', received status code '${statusCode}'.`);
        return { status: statusCode, data: { url: resourceUrl } };
      }
    }

    logger.info(`Resource Queue: Successfully retrieved resource metadata for resource '${resourceUrl}'`);
    return { status: httpCodes.OK, data: { url: resourceUrl } };
  } catch (error) {
    auditLogger.error(`Resource Queue: Unable to retrieve metadata or title for Resource (ID: ${resourceId} URL: ${resourceUrl}), please make sure this is a valid address:`, error);
    return { status: httpCodes.NOT_FOUND, data: { url: resourceUrl } };
  }
};

export {
  axios,
  getResourceMetaDataJob,
};
