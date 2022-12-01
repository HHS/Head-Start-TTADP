/* eslint-disable import/prefer-default-export */
// regex to match a valid url, it must start with http:// or https://, have at least one dot, and not end with a dot or a space
const VALID_URL_REGEX = /^https?:\/\/.*\.[^ |^.]/;

// regex and function copied from frontend (they should match)
export const isValidResourceUrl = (url) => {
  try {
    const u = new URL(url);
    return (u !== '' && VALID_URL_REGEX.test(u));
  } catch (e) {
    return false;
  }
};
