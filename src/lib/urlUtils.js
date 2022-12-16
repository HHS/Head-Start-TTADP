/* eslint-disable import/prefer-default-export */
// regex to match a valid url, it must start with http:// or https://, have at least one dot, and not end with a dot or a space
export const VALID_URL_REGEX = '(?:(?:http|ftp|https|file):\\/\\/)(?:www\\.)?(?:[\\w%_-]+(?:(?:\\.[\\w%_-]+)+)|(?:\\/[\\w][:]))(?:[\\w\\\\\'\'.,@?^=%&:\\/~+#()-]*[\\w@?^=%&\\/~+#-])';
export const VALID_DOMAIN_REGEX = '^(?:(?:http|ftp|https|file):\\/\\/)?(?:www\\.)?((?:[\\w%_-]+(?:(?:\\.[\\w%_-]+)+)|(?:\\/[\\w][:])))';

// regex and function copied from frontend (they should match)
export const isValidResourceUrl = (url) => {
  try {
    const httpOccurences = (url.match(/http/gi) || []).length;
    if (httpOccurences !== 1 || !VALID_URL_REGEX.test(url)) {
      return false;
    }
    const u = new URL(url);
    return (u !== '');
  } catch (e) {
    return false;
  }
};
