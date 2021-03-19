import { GOVERNMENT_HOSTNAME_EXTENSION } from './Constants';

/**
 * Given a potential url, verify that it is a valid url with http(s) scheme.
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
 * Decide if given url is internal goverment link.
 * Internal gov link is defined as any host name that does not
 * end with `GOVERNMENT_HOSTNAME_EXTENSION`

 * Assumes url passed in is valid.
 */
export const isInternalGovernmentLink = (url) => {
  const newUrl = new URL(url);
  return newUrl.host.endsWith(GOVERNMENT_HOSTNAME_EXTENSION);
};

/**
 * Decide if a given url is external or not. Assumes, url is already valid.
 * Definition of external is anything not matching the host name
 * *OR*
 * Any host name that does not end with `GOVERNMENT_HOSTNAME_EXTENSION`
 */
export const isExternalURL = (url) => {
  const newUrl = new URL(url);
  let currentHost;

  // When running locally, the env `TTA_SMART_HUB_URI` is not available, the only way to make it
  // accessble is to tell create-react about it, but we need to add the prefix `REACT_APP_*` to any
  // envs that we want create-react to pick up. And this is what we get :/
  if (process.env.NODE_ENV === 'development') {
    currentHost = new URL(process.env.REACT_APP_TTA_SMART_HUB_URI);
  } else {
    currentHost = new URL(process.env.TTA_SMART_HUB_URI);
  }

  if (isInternalGovernmentLink(url)) {
    return false;
  }

  return (newUrl.host !== currentHost.host);
};
