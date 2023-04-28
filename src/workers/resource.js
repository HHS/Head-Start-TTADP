// import axios from 'axios';
import { Resource } from '../models';
import { auditLogger, logger } from '../logger';

const processResourceInfo = async (job) => {
  const { url } = job.data;
  let res;
  try {
    // Use axios to get url info.
    // res = await axios.get(url);
    res = {
      data: `
    <!DOCTYPE html>
      <html lang="en" dir="ltr" prefix="og: https://ogp.me/ns#" class="no-js">
      <head>
      <meta charset="utf-8" />
      <script>window.dataLayer = window.dataLayer || []; window.dataLayer.push({"language":"en","country":"US","siteName":"ECLKC","entityLangcode":"en","entityVid":"326638","entityCreated":"1490966152","entityStatus":"1","entityName":"leraa","entityType":"node","entityBundle":"page_front","entityId":"2212","entityTitle":"Head Start","userUid":0});</script>
      <link rel="canonical" href="https://eclkc.ohs.acf.hhs.gov/" />
      <link rel="image_src" href="https://eclkc.ohs.acf.hhs.gov/themes/gesso/images/site-logo.png" />
      <title>Head Start | ECLKC</title>
      <body>
      test
      </body>
      </html>`,
    };
    // Get page title.
    const foundTitle = res.data.match(/<title[^>]*>([^<]+)<\/title>/);

    if (foundTitle && foundTitle.length >= 1) {
      // Get title.
      const titleToUpdate = foundTitle[1];

      // update URL in DB.
      await Resource.update({
        title: titleToUpdate,
      }, {
        where: { url },
        individualHooks: false,
      });
    } else {
      auditLogger.info(`Resource Queue: Warning, unable to retrieve resource metadata for resource '${url}'.`);
      return ({ status: res.status, data: { url } });
    }
  } catch (error) {
    auditLogger.error(`Resource Queue: Error, unable to retrieve resource metadata for resource '${url}': ${error.message}`);
    return { status: 500, data: error.message };
  }
  logger.info(`Resource Queue: Successfully retrieved resource metadata for resource '${url}'`);
  return ({ status: res.status, data: res.data });
};

export default processResourceInfo;
