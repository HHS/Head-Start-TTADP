/**
 * Given a potential url, verify that it is a valid url
 * https://stackoverflow.com/a/34695026
 */
export const isValidURL = (url) => {
  const a = document.createElement('a');
  a.href = url;
  return (a.host && a.host !== window.location.host);
};

/**
 * Decide if a given url is external or not.
 * Definition of external is anything not matching the host name.
 */
export const isExternalURL = (url) => !url.startsWith(process.env.TTA_SMART_HUB_URI);
