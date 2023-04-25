import axios from 'axios';
import { Resource } from '../models';

const processResourceInfo = async (resourceId) => {
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
          where: { id: resource.dataValues.id },
          individualHooks: false,
        });
      }
    }
  } catch (error) {
    return { status: error.response.status, data: error.response.data };
  }
  return ({ status: res.status, data: res.data });
};

export default processResourceInfo;
