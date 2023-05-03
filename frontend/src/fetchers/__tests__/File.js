import fetchMock from 'fetch-mock';
import join from 'url-join';
import {
  uploadFile,
  deleteFile,
  uploadOnlyFile,
  uploadObjectivesFile,
  deleteObjectiveFile,
  deleteReportFile,
} from '../File';

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
    fetchMock.deleteOnce(join(fileApiUrl, '1'), 200);
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

  describe('upload only file', () => {
    it('success', async () => {
      fetchMock.postOnce(join(fileApiUrl, 'upload'), { ok: true });
      const res = await uploadOnlyFile(fakeFile);
      expect(res.ok).toBe(true);
    });
    it('failure', async () => {
      fetchMock.postOnce(join(fileApiUrl, 'upload'), 500);
      await expect(uploadFile(uploadOnlyFile)).rejects.toThrow();
    });
  });

  describe('upload objectives file', () => {
    it('success', async () => {
      fetchMock.postOnce(join(fileApiUrl, 'objectives'), { ok: true });
      const res = await uploadObjectivesFile(fakeFile);
      expect(res.ok).toBe(true);
    });
    it('failure', async () => {
      fetchMock.postOnce(join(fileApiUrl, 'objectives'), 500);
      await expect(uploadFile(uploadObjectivesFile)).rejects.toThrow();
    });
  });

  describe('delete objectives file', () => {
    it('success', async () => {
      fetchMock.deleteOnce(join(fileApiUrl, '1', 'objectives'), { ok: true });
      const res = await deleteObjectiveFile(1, [1]);
      expect(res.ok).toBe(true);
    });
    it('failure', async () => {
      fetchMock.deleteOnce(join(fileApiUrl, '1', 'objectives'), 500);
      await expect(deleteObjectiveFile(1, [1])).rejects.toThrow();
    });
    describe('deleteReportFile', () => {
      it('success', async () => {
        fetchMock.deleteOnce(join(fileApiUrl, 'r', '1', '1'), { ok: true });
        const res = await deleteReportFile(1, 1);
        expect(res.ok).toBe(true);
      });
    });
  });
});
