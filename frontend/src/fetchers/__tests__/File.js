import fetchMock from 'fetch-mock';
import join from 'url-join';
import uploadFile from '../File';

const activityReportUrl = join('/', 'api', 'files');
const fakeFile = new File(['testing'], 'test.txt');

describe('File fetcher', () => {
  it('test that the file gets uploaded', async () => {
    fetchMock.mock(activityReportUrl, {
      body: { id: 1 },
      status: 200,
    });
    const res = await uploadFile(fakeFile);
    expect(res).toEqual({ id: 1 });
  });
});
