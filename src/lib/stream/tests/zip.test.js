import { Readable } from 'stream';
import ZipStream from '../zip';

// Mocks for the 'unzipper' and 'path' modules
jest.mock('unzipper', () => {
  // Import the Readable stream class inside the mock factory function
  const { Readable: ReadableInMock } = jest.requireActual('stream');

  return {
    Parse: jest.fn().mockImplementation(() => {
      const mockStream = new ReadableInMock();
      // eslint-disable-next-line no-underscore-dangle
      mockStream._read = () => {}; // No-op
      process.nextTick(() => {
        mockStream.emit('entry', {
          type: 'File',
          path: 'folder/file.txt',
          vars: {
            uncompressedSize: 100,
            lastModifiedDateTime: new Date('2020-01-01'),
            crc32: '1234abcd',
          },
          pipe: jest.fn(),
          autodrain: jest.fn(),
        });
        mockStream.emit('finish');
      });
      return mockStream;
    }),
  };
});

jest.mock('path', () => ({
  basename: jest.fn((filePath) => filePath.split('/').pop()),
  dirname: jest.fn((filePath) => filePath.split('/').slice(0, -1).join('/')),
  join: jest.fn((...parts) => parts.join('/')),
}));

describe('ZipStream', () => {
  let zipStream;
  let mockReadable;

  beforeEach(() => {
    mockReadable = new Readable({
      read(size) {},
    });
    // eslint-disable-next-line no-underscore-dangle
    mockReadable._read = () => {}; // No-op
    zipStream = new ZipStream(mockReadable, undefined, [{ name: 'file.txt', path: 'folder' }]);
  });

  test('listFiles should return file paths', async () => {
    const files = await zipStream.listFiles();
    expect(files).toEqual(['folder/file.txt']);
  });

  test('getFileDetails should return file info if file exists', async () => {
    const fileInfo = await zipStream.getFileDetails('folder/file.txt');
    expect(fileInfo).toEqual({
      name: 'file.txt',
      path: 'folder',
      type: 'File',
      size: 100,
      date: new Date('2020-01-01'),
      crc32: '1234abcd',
    });
  });

  test('getFileDetails should return null if file does not exist', async () => {
    const fileInfo = await zipStream.getFileDetails('nonexistent/file.txt');
    expect(fileInfo).toBeNull();
  });

  test('getAllFileDetails should return all file details', async () => {
    const fileDetails = await zipStream.getAllFileDetails();
    expect(fileDetails).toEqual([
      {
        crc32: '1234abcd',
        name: 'file.txt',
        path: 'folder',
        type: 'File',
        size: 100,
        date: new Date('2020-01-01'),
      },
    ]);
  });

  test('getFileStream should return null for a non-existing file', async () => {
    const fileStream = await zipStream.getFileStream('nonexistent/file.txt');
    expect(fileStream).toBeNull();
  });

  test('constructor should handle default filesNeedingStreams', async () => {
    const zipStreamDefault = new ZipStream(mockReadable);
    const files = await zipStreamDefault.listFiles();
    expect(files).toEqual(['folder/file.txt']);
  });

  test('getFileDetails should include crc32 if present', async () => {
    const fileInfo = await zipStream.getFileDetails('folder/file.txt');
    expect(fileInfo).toEqual({
      name: 'file.txt',
      path: 'folder',
      type: 'File',
      size: 100,
      date: new Date('2020-01-01'),
      crc32: '1234abcd',
    });
  });
});
