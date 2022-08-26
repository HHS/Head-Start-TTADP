import fetchMock from 'fetch-mock';
import join from 'url-join';
import { uploadFile, deleteFile } from '../File';

const fileApiUrl = join('/', 'api', 'files');
const fakeFile = new File(['testing'], 'test.txt');
fetchMock.config.sendAsJson = true;
describe('File fetcher', () => {
  beforeEach(() => fetchMock.reset());
  it('test that the file gets uploaded', async () => {
    fetchMock.postOnce(fileApiUrl, { id: 1 });
    const res = await uploadFile(fakeFile);
    expect(res.id).toBe(1);
  });
  it('test that the file gets deleted', async () => {
    fetchMock.deleteOnce(join(fileApiUrl, 'r', '1', '1'), 200);
    const res = await deleteFile(1, 1);
    expect(res.status).toBe(200);
  });
  it('file upload throws an error if the response status isn\'t 200', async () => {
    fetchMock.postOnce(fileApiUrl, 500);
    await expect(uploadFile(fakeFile)).rejects.toThrow();
  });
  it('file delete throws an error if the response status isn\'t 200', async () => {
    fetchMock.deleteOnce(join(fileApiUrl, '1', '1'), 500);
    await expect(deleteFile(1, 1)).rejects.toThrow();
  });
});
