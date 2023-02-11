/* eslint-disable import/prefer-default-export */
/* eslint-disable no-useless-escape */
// regex to match a valid url, it must start with http:// or https://, have at least one dot, and not end with a dot or a space
export const VALID_URL_REGEX = /(?<url>(?<scheme>http(?:s)?|ftp(?:s)?|sftp):\/\/(?:(?<user>[a-zA-Z0-9._]+)(?:[:](?<password>[a-zA-Z0-9%._\+~#=]+))?[@])?(?:(?:www\.)?(?<host>[-a-zA-Z0-9%._\+~#=]{1,}\.[a-z]{2,6})|(?<ip>(?:[0-9]{1,3}\.){3}[0-9]{1,3}))(?:[:](?<port>[0-9]+))?(?:[\/](?<path>[-a-zA-Z0-9'@:%_\+.,~#&\/=()]*[-a-zA-Z0-9@:%_\+.~#&\/=()])?)?(?:[?](?<query>[-a-zA-Z0-9@:%_\+.~#&\/=()]*))*)/ig;

// regex and function copied from frontend (they should match)
export const isValidResourceUrl = (input) => {
  try {
    const matches = [...input.matchAll(VALID_URL_REGEX)].map(({ groups }) => groups);
    if (matches?.length !== 1) {
      return false;
    }
    const u = new URL(matches[0].url);
    return (u !== '');
  } catch (e) {
    return false;
  }
};
