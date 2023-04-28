import { getResourceMetaDataJob } from './resource';
import db, { Resource } from '../models';

jest.mock('bull');

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
    const got = await getResourceMetaDataJob({ data: { resourceId: 1, resourceUrl: 'http://www.test.gov' } });
    expect(got.status).toBe(200);
    expect(got.data).toStrictEqual({ resourceId: 1, resourceUrl: 'http://www.test.gov', res: {} });
  });
});
