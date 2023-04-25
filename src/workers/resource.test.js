import axios from 'axios';
import processResourceInfo from './resource';
import db, { Resource } from '../models';

const urlReturn = `
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

const mockAxios = jest.spyOn(axios, 'get').mockImplementation(() => Promise.resolve());
const axiosCleanResponse = { status: 200, data: urlReturn };

const axiosNoTitleResponse = { status: 200, data: urlMissingTitle };

const axiosNotFoundError = new Error();
axiosNotFoundError.response = { status: 404 };

const mockFindOne = jest.spyOn(Resource, 'findOne').mockImplementation(
  () => Promise.resolve({ dataValues: { id: 1, url: 'https://eclkc.ohs.acf.hhs.gov' } }),
);
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
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosCleanResponse));
    const got = await processResourceInfo(1);
    expect(got.status).toBe(200);
    expect(got.data).toStrictEqual(urlReturn);

    expect(mockAxios).toBeCalled();
    expect(mockFindOne).toBeCalledWith({ where: { id: 1 } });
    expect(mockUpdate).toBeCalledWith(
      { title: 'Head Start | ECLKC' },
      { where: { id: 1 }, individualHooks: true },
    );
  });

  it('tests a resource without a title', async () => {
    mockAxios.mockImplementationOnce(() => Promise.resolve(axiosNoTitleResponse));
    const got = await processResourceInfo(1);
    expect(got.status).toBe(200);
    expect(got.data).toStrictEqual(urlMissingTitle);
    expect(mockAxios).toBeCalled();
    expect(mockFindOne).toBeCalledWith({ where: { id: 1 } });
    expect(mockUpdate).not.toBeCalled();
  });

  it('tests a resource not found', async () => {
    mockAxios.mockImplementationOnce(() => Promise.reject(axiosNotFoundError));
    const got = await processResourceInfo(1);
    expect(got.status).toBe(404);
    expect(got.data).toStrictEqual(undefined);
    expect(mockAxios).toBeCalled();
    expect(mockFindOne).toBeCalledWith({ where: { id: 1 } });
    expect(mockUpdate).not.toBeCalledWith();
  });
});
