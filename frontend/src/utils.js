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
  const newUrl = new URL(url);
  let currentHost;
  if (process.env.NODE_ENV === 'development') {
    currentHost = new URL(process.env.REACT_APP_TTA_SMART_HUB_URI);
  } else {
    currentHost = new URL(process.env.TTA_SMART_HUB_URI);
  }

  return !(newUrl.host === currentHost.host);
};
