/* eslint-disable no-useless-escape */
import axios from 'axios';
import { getResourceMetaDataJob } from './resource';
import db, { Resource } from '../models';

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

describe('resource worker tests with db calls', () => {
  let testResourceToUpdate;
  const testResourceToUpdateUrl = 'http://eclkc.ohs.acf.hhs.gov';
  let testResourceToIgnore;
  const testResourceToIgnoreUrl = 'http://eclkc.ohs.acf.hhs.ignore.gov';
  beforeAll(async () => {
    // Create a resource.
    testResourceToUpdate = await Resource.create({ url: testResourceToUpdateUrl });

    // Create resource to ignore.
    testResourceToIgnore = await Resource.create({ url: testResourceToIgnoreUrl });
  });

  afterAll(async () => {
    await Resource.destroy({
      where: {
        id: [
          testResourceToUpdateUrl.id,
          testResourceToIgnoreUrl.id],
      },
    });
    await db.sequelize.close();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });
  it('updates title, national centers, and metadata in the db', async () => {
    // Scrape mock.
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosCleanResponse));

    // Metadata mock.
    mockAxios.mockImplementationOnce(() => Promise.resolve({ status: 200, data: metadata }));

    // Call get resource metadata job.
    const got = await getResourceMetaDataJob({
      data: {
        resourceId: 1,
        resourceUrl: testResourceToUpdateUrl,
      },
    });
    expect(got.status).toBe(200);
    expect(got.data).toStrictEqual({ url: testResourceToUpdateUrl });

    // Retrieve the resource to update.
    const resourceToUpdate = await Resource.findOne({ where: { url: testResourceToUpdateUrl } });
    expect(resourceToUpdate.title).toBe('Head Start | ECLKC');
    expect(resourceToUpdate.metadata).toStrictEqual({
      title: [{ value: 'Head Start Heals Campaign' }],
      changed: [{ value: '2023-05-26T18:57:15+00:00' }],
      created: [{ value: '2020-04-21T15:20:23+00:00' }],
      langcode: [{ value: 'en' }],
      fieldContext: [
        {
          value: '<p><img alt="Two pairs of hands holding a heart.</p>\r\n',
        },
      ],
      fieldTaxonomyTopic: [{ target_type: 'taxonomy_term' }],
      fieldTaxonomyNationalCenters: [{ target_type: 'taxonomy_term' }],
    });
    expect(resourceToUpdate.metadataUpdatedAt).not.toBeNull();

    // Retrieve the resource to ignore.
    const resourceToIgnore = await Resource.findOne({ where: { url: testResourceToIgnoreUrl } });
    expect(resourceToIgnore.title).toBeNull();
    expect(resourceToIgnore.metadata).toBeNull();
    expect(resourceToIgnore.metadataUpdatedAt).toBeNull();
  });
});
