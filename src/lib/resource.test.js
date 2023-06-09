/* eslint-disable no-useless-escape */
import axios from 'axios';
import { getResourceMetaDataJob } from './resource';
import db, { Resource } from '../models';
import { auditLogger } from '../logger';

jest.mock('../logger');
jest.mock('bull');

const urlReturn = `
<!DOCTYPE html>
<html lang="en" dir="ltr" prefix="og: https://ogp.me/ns#" class="no-js">
<head>
<meta charset="utf-8" />
<meta name="language" content="en" />
<meta name="topic" content="Mental Health" />
<meta name="resource-type" content="Article" />
<meta ="national-centers" content="Health, Behavioral Health, and Safety" />
<meta name="node-id" content="7858" />
<meta ="exclude-from-dynamic-view" content="False" />
<script>window.dataLayer = window.dataLayer || []; window.dataLayer.push({"language":"en","country":"US","siteName":"ECLKC","entityLangcode":"en","entityVid":"326638","entityCreated":"1490966152","entityStatus":"1","entityName":"leraa","entityType":"node","entityBundle":"page_front","entityId":"2212","entityTitle":"Head Start","userUid":0});</script>
<link rel="canonical" href="https://eclkc.ohs.acf.hhs.gov/" />
<link rel="image_src" href="https://eclkc.ohs.acf.hhs.gov/themes/gesso/images/site-logo.png" />
<title>Head Start | ECLKC</title>
<body>
test
</body>
</html>
`;

const urlMissingTitle = `
<!DOCTYPE html>
<html lang="en" dir="ltr" prefix="og: https://ogp.me/ns#" class="no-js">
<body>
test
</body>
</html>
`;

const urlTitleOnly = `
<!DOCTYPE html>
<html lang="en" dir="ltr" prefix="og: https://ogp.me/ns#" class="no-js">
<head>
<meta charset="utf-8" />
<meta name="language" content="en" />
<meta name="topic" content="Mental Health" />
<meta name="resource-type" content="Article" />
<meta name="node-id" content="7858" />
<meta ="exclude-from-dynamic-view" content="False" />
<script>window.dataLayer = window.dataLayer || []; window.dataLayer.push({"language":"en","country":"US","siteName":"ECLKC","entityLangcode":"en","entityVid":"326638","entityCreated":"1490966152","entityStatus":"1","entityName":"leraa","entityType":"node","entityBundle":"page_front","entityId":"2212","entityTitle":"Head Start","userUid":0});</script>
<link rel="canonical" href="https://eclkc.ohs.acf.hhs.gov/" />
<link rel="image_src" href="https://eclkc.ohs.acf.hhs.gov/themes/gesso/images/site-logo.png" />
<title>Title only</title>
<body>
test
</body>
</html>
`;

const urlNcOnly = `
<!DOCTYPE html>
<html lang="en" dir="ltr" prefix="og: https://ogp.me/ns#" class="no-js">
<head>
<meta charset="utf-8" />
<meta name="language" content="en" />
<meta ="national-centers" content="NC only" />
<meta name="topic" content="Mental Health" />
<meta name="resource-type" content="Article" />
<meta name="node-id" content="7858" />
<meta ="exclude-from-dynamic-view" content="False" />
<script>window.dataLayer = window.dataLayer || []; window.dataLayer.push({"language":"en","country":"US","siteName":"ECLKC","entityLangcode":"en","entityVid":"326638","entityCreated":"1490966152","entityStatus":"1","entityName":"leraa","entityType":"node","entityBundle":"page_front","entityId":"2212","entityTitle":"Head Start","userUid":0});</script>
<link rel="canonical" href="https://eclkc.ohs.acf.hhs.gov/" />
<link rel="image_src" href="https://eclkc.ohs.acf.hhs.gov/themes/gesso/images/site-logo.png" />
<body>
test
</body>
</html>
`;

const metadata = {
  created: [{ value: '2020-04-21T15:20:23+00:00' }],
  changed: [{ value: '2023-05-26T18:57:15+00:00' }],
  title: [{ value: 'Head Start Heals Campaign' }],
  field_taxonomy_national_centers: [{ target_type: 'taxonomy_term' }],
  field_taxonomy_topic: [{ target_type: 'taxonomy_term' }],
  langcode: [{ value: 'en' }],
  field_context: [{ value: '<p><img alt=\"Two pairs of hands holding a heart.</p>\r\n' }],
};

const mockAxios = jest.spyOn(axios, 'get').mockImplementation(() => Promise.resolve());
const axiosCleanResponse = { status: 200, data: urlReturn };
const axiosOnlyTitleResponse = { status: 200, data: urlTitleOnly };
const axiosOnlyNcResponse = { status: 200, data: urlNcOnly };
const axiosNoTitleOrNcResponse = { status: 404, data: urlMissingTitle };
const axiosResourceNotFound = { status: 404, data: 'Not Found' };
const axiosNotFoundError = new Error();
axiosNotFoundError.response = { status: 500, data: 'Error' };
const mockUpdate = jest.spyOn(Resource, 'update').mockImplementation(() => Promise.resolve());

describe('resource worker tests', () => {
  let resource;
  afterAll(async () => {
    await Resource.destroy({ where: { id: resource.id } });
    await db.sequelize.close();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('tests a clean resource get', async () => {
    // Scrape.
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosCleanResponse));
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]));

    // Metadata.
    mockAxios.mockImplementationOnce(() => Promise.resolve({ status: 200, data: metadata }));
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]));

    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.eclkc.ohs.acf.hhs.gov' } });
    expect(got.status).toBe(200);
    expect(got.data).toStrictEqual({ url: 'http://www.eclkc.ohs.acf.hhs.gov' });

    expect(mockUpdate).toBeCalledTimes(2);

    // Check title update.
    expect(mockUpdate).toBeCalledWith(
      {
        title: 'Head Start | ECLKC',
      },
      { where: { url: 'http://www.eclkc.ohs.acf.hhs.gov' }, individualHooks: false },
    );
    // Check the update call.
    expect(mockUpdate).toBeCalledWith(
      {
        metadata:
          {
            changed: [{ value: '2023-05-26T18:57:15+00:00' }],
            created: [{ value: '2020-04-21T15:20:23+00:00' }],
            fieldContext: [{ value: '<p><img alt=\"Two pairs of hands holding a heart.</p>\r\n' }],
            fieldTaxonomyNationalCenters: [{ target_type: 'taxonomy_term' }],
            fieldTaxonomyTopic: [{ target_type: 'taxonomy_term' }],
            langcode: [{ value: 'en' }],
            title: [{ value: 'Head Start Heals Campaign' }],
          },
        metadataUpdatedAt: expect.anything(),
      },
      { where: { url: 'http://www.eclkc.ohs.acf.hhs.gov' }, individualHooks: false },
    );
  });

  it('tests a resource without a title or national centers', async () => {
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosNoTitleOrNcResponse));
    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.test.gov' } });
    expect(got.status).toBe(404);
    expect(got.data).toStrictEqual({ url: 'http://www.test.gov' });
    expect(mockAxios).toBeCalled();
    expect(mockUpdate).not.toBeCalled();
  });

  it('tests a resource with only title', async () => {
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosOnlyTitleResponse));
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]));
    await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.test.gov' } });

    // Check title update.
    expect(mockUpdate).toBeCalledWith(
      {
        title: 'Title only',
      },
      { where: { url: 'http://www.test.gov' }, individualHooks: false },
    );
  });

  it('tests a resource url not found', async () => {
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosResourceNotFound));
    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'http://www.test.gov' } });
    expect(got.status).toBe(404);
    expect(got.data).toStrictEqual({ url: 'http://www.test.gov' });
    expect(mockAxios).toBeCalled();
    expect(mockUpdate).not.toBeCalledWith();
  });

  it('tests a resource retrieve error', async () => {
    mockAxios.mockImplementationOnce(() => Promise.reject(axiosNotFoundError));
    await expect(getResourceMetaDataJob({ data: { resourceUrl: 'http://www.test.gov' } })).rejects.toThrow(Error);
  });

  it('tests metadata populate', async () => {
    // Mock TITLE get.
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosCleanResponse));
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]));

    // mock the axios call to return the METADATA object.
    mockAxios.mockImplementationOnce(() => Promise.resolve({ status: 200, data: metadata }));
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]));

    // Call the function.
    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/head-start-heals-campaign' } });

    // Check the response.
    expect(got.status).toBe(200);

    // Check the data.
    expect(got.data).toStrictEqual({ url: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/head-start-heals-campaign' });

    // Check the axios call.
    expect(mockAxios).toBeCalled();

    // Check title update.
    expect(mockUpdate).toBeCalledWith(
      {
        title: 'Head Start | ECLKC',
      },
      { where: { url: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/head-start-heals-campaign' }, individualHooks: false },
    );
    // Check the update call.
    expect(mockUpdate).toBeCalledWith(
      {
        metadata:
          {
            changed: [{ value: '2023-05-26T18:57:15+00:00' }],
            created: [{ value: '2020-04-21T15:20:23+00:00' }],
            fieldContext: [{ value: '<p><img alt=\"Two pairs of hands holding a heart.</p>\r\n' }],
            fieldTaxonomyNationalCenters: [{ target_type: 'taxonomy_term' }],
            fieldTaxonomyTopic: [{ target_type: 'taxonomy_term' }],
            langcode: [{ value: 'en' }],
            title: [{ value: 'Head Start Heals Campaign' }],
          },
        metadataUpdatedAt: expect.anything(),
      },
      { where: { url: 'https://eclkc.ohs.acf.hhs.gov/mental-health/article/head-start-heals-campaign' }, individualHooks: false },
    );
  });

  it('skips metadata if resource does not contain eclkc', async () => {
    // Mock TITLE get.
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosCleanResponse));
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]));

    // Call the function.
    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'https://test.gov/mental-health/article/head-start-heals-campaign' } });

    // Check the response.
    expect(got.status).toBe(200);

    // Check the data.
    expect(got.data).toStrictEqual({ url: 'https://test.gov/mental-health/article/head-start-heals-campaign' });

    // Check the axios call.
    expect(mockAxios).toBeCalled();

    // Check title update.
    expect(mockUpdate).toBeCalledWith(
      { title: 'Head Start | ECLKC' },
      { where: { url: 'https://test.gov/mental-health/article/head-start-heals-campaign' }, individualHooks: false },
    );

    // expect mockUpdate to have only been called once.
    expect(mockUpdate).toBeCalledTimes(1);

    // expect auditlogger.info to have been called with the correct message.
    expect(auditLogger.info).toBeCalledWith("Resource Queue: Warning, not a ECLKC resource SKIPPING metadata collection for: 'https://test.gov/mental-health/article/head-start-heals-campaign'.");
  });

  it('metadata handles errors', async () => {
    // Mock TITLE get.
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosCleanResponse));
    mockUpdate.mockImplementationOnce(() => Promise.resolve([1]));

    // Call the function.
    const got = await getResourceMetaDataJob({ data: { resourceUrl: 'https://test.gov/mental-health/article/head-start-heals-campaign' } });

    // Check the response.
    expect(got.status).toBe(200);

    // Check the data.
    expect(got.data).toStrictEqual({ url: 'https://test.gov/mental-health/article/head-start-heals-campaign' });

    // Check the axios call.
    expect(mockAxios).toBeCalled();

    // Check title update.
    expect(mockUpdate).toBeCalledWith(
      { title: 'Head Start | ECLKC' },
      { where: { url: 'https://test.gov/mental-health/article/head-start-heals-campaign' }, individualHooks: false },
    );

    // expect mockUpdate to have only been called once.
    expect(mockUpdate).toBeCalledTimes(1);

    // throw an error on the second mockUpdate call.
    mockUpdate.mockImplementationOnce(() => Promise.reject(new Error('mockUpdate error')));

    // assert auditlogger is called with the correct message.
    expect(auditLogger.info).toBeCalledWith("Resource Queue: Warning, not a ECLKC resource SKIPPING metadata collection for: 'https://test.gov/mental-health/article/head-start-heals-campaign'.");
  });
});
