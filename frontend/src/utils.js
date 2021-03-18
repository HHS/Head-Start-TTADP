import { GOVERMENT_HOSTNAME_EXTENSION } from './Constants';

/**
 * Given a potential url, verify that it is a valid url
 */
export const isValidURL = (url) => {
  try {
    const potential = new URL(url);
    // Verify that its only http(s)
    return ['https:', 'http:'].includes(potential.protocol);
  } catch (err) {
    return false;
  }
};

/**
 * Decide if a given url is external or not. Assumes, url is already valid.
 * Definition of external is anything not matching the host name.
 */
export const isExternalURL = (url) => {
  if (url.endsWith(GOVERMENT_HOSTNAME_EXTENSION)) {
    return true;
  }

  return !url.startsWith(process.env.TTA_SMART_HUB_URI);
};
