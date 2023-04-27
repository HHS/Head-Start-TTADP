/* eslint-disable no-console */
import axios from 'axios';
import { auditLogger } from '../logger';
import { Resource } from '../models';

const processResourceInfo = async (resourceId) => {
  let returnV;
  try {
    let res;
    try {
    // Get Url from DB.
      const resource = await Resource.findOne({ where: { id: resourceId } });

      if (resource && resource.url) {
      // Use axios to get url info.
        res = await axios.get(resource.url);

        // Get page title.
        const foundTitle = res.data.match(/<title[^>]*>([^<]+)<\/title>/);

        if (foundTitle && foundTitle.length >= 1) {
        // Get title.
          const titleToUpdate = foundTitle[1];

          // update URL in DB.
          await Resource.update({
            title: titleToUpdate,
          }, {
            where: { id: resource.id },
            individualHooks: false,
          });
        }
      }
    } catch (error) {
      auditLogger.error('\n\n\n----AXIOS ERROR:', error);
      return { status: error.response.status, data: error.response.data };
    }
    auditLogger.error('\n\n\n----AXIOS ERROR2:', res);
    returnV = { status: res ? res.status : 404, data: res ? res.data : {} };
  } catch (error) {
    auditLogger.error('\n\n\n----AXIOS ERROR3:', error);
  }
  return returnV;
};

export default processResourceInfo;
