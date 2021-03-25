import htmlToDraft from 'html-to-draftjs';
import { EditorState, ContentState } from 'draft-js';
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
 * Definition of external is anything not matching the current host name
 * *OR*
 * Any host name that does not end with `GOVERNMENT_HOSTNAME_EXTENSION`
 */
export const isExternalURL = (url) => {
  const newUrl = new URL(url);
  const currentHost = window.location;

  if (isInternalGovernmentLink(url)) {
    return false;
  }

  return (newUrl.host !== currentHost.host);
};

/**
 * Given an html string.
 * Return an `EditorState` object that is used for the Rich Editor Text Box.
 *
 */

export const getEditorState = (name) => {
  const { contentBlocks, entityMap } = htmlToDraft(name || '');
  const contentState = ContentState.createFromBlockArray(contentBlocks, entityMap);
  return EditorState.createWithContent(contentState);
};
