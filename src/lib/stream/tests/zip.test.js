import { Readable } from 'stream';
import * as unzipper from 'unzipper';
import ZipStream from '../zip';

describe('ZipStream', () => {
  let zipStream;
  let zipFileStream;
  let zipEntry;

  beforeEach(() => {
    zipStream = new Readable();
    zipFileStream = new Readable();
    zipEntry = {
      isDirectory: jest.fn().mockReturnValue(false),
      path: 'file.txt',
      type: 'file',
      vars: {
        uncompressedSize: 100,
        lastModifiedTime: new Date(),
      },
      autodrain: jest.fn(),
    };
  });

  describe('listFiles', () => {
    it('should return an empty array if there are no files in the zip stream', async () => {
      // Arrange
      const zipStreamMock = jest.spyOn(zipStream, 'pipe').mockReturnValue(zipStream);
      const unzipperParseMock = jest.spyOn(unzipper, 'Parse').mockReturnValue(zipStream);

      // Act
      const zip = new ZipStream(zipStream);
      const result = await zip.listFiles();

      // Assert
      expect(result).toEqual([]);
      expect(zipStreamMock).toHaveBeenCalledWith(unzipper.Parse());
      expect(unzipperParseMock).toHaveBeenCalled();
    });

    it('should return an array of file paths in the zip stream', async () => {
      // Arrange
      const zipStreamMock = jest.spyOn(zipStream, 'pipe').mockReturnValue(zipStream);
      const unzipperParseMock = jest.spyOn(unzipper, 'Parse').mockReturnValue(zipStream);
      const entryEventCallback = zipStream.on.mock.calls[0][1];

      // Act
      const zip = new ZipStream(zipStream);
      const promise = zip.listFiles();

      // Simulate entry events
      entryEventCallback(zipEntry);
      entryEventCallback({ isDirectory: jest.fn().mockReturnValue(true) });
      entryEventCallback(zipEntry);

      const result = await promise;

      // Assert
      expect(result).toEqual(['file.txt', 'file.txt']);
      expect(zipStreamMock).toHaveBeenCalledWith(unzipper.Parse());
      expect(unzipperParseMock).toHaveBeenCalled();
      expect(zipEntry.autodrain).toHaveBeenCalledTimes(2);
    });
  });

  describe('getFileDetails', () => {
    it('should return null if the file does not exist in the zip stream', async () => {
      // Arrange
      const zipStreamMock = jest.spyOn(zipStream, 'pipe').mockReturnValue(zipStream);
      const unzipperParseOneMock = jest.spyOn(unzipper, 'ParseOne').mockReturnValue(zipStream);
      const errorEventCallback = zipStream.on.mock.calls[0][1];

      // Act
      const zip = new ZipStream(zipStream);
      const result = await zip.getFileDetails('nonexistent.txt');

      // Simulate error event
      errorEventCallback();

      // Assert
      expect(result).toBeNull();
      expect(zipStreamMock).toHaveBeenCalledWith(unzipper.ParseOne('nonexistent.txt'));
      expect(unzipperParseOneMock).toHaveBeenCalled();
    });

    it('should return null if the file is a directory', async () => {
      // Arrange
      const zipStreamMock = jest.spyOn(zipStream, 'pipe').mockReturnValue(zipStream);
      const unzipperParseOneMock = jest.spyOn(unzipper, 'ParseOne').mockReturnValue(zipStream);
      const entryEventCallback = zipStream.on.mock.calls[0][1];

      // Act
      const zip = new ZipStream(zipStream);
      const promise = zip.getFileDetails('directory/');

      // Simulate entry event
      entryEventCallback({ isDirectory: jest.fn().mockReturnValue(true) });

      const result = await promise;

      // Assert
      expect(result).toBeNull();
      expect(zipStreamMock).toHaveBeenCalledWith(unzipper.ParseOne('directory/'));
      expect(unzipperParseOneMock).toHaveBeenCalled();
    });

    it('should return the file details if the file exists in the zip stream', async () => {
      // Arrange
      const zipStreamMock = jest.spyOn(zipStream, 'pipe').mockReturnValue(zipStream);
      const unzipperParseOneMock = jest.spyOn(unzipper, 'ParseOne').mockReturnValue(zipStream);
      const entryEventCallback = zipStream.on.mock.calls[0][1];

      // Act
      const zip = new ZipStream(zipStream);
      const promise = zip.getFileDetails('file.txt');

      // Simulate entry event
      entryEventCallback(zipEntry);

      const result = await promise;

      // Assert
      expect(result).toEqual({
        name: 'file.txt',
        type: 'file',
        size: 100,
        date: expect.any(Date),
      });
      expect(zipStreamMock).toHaveBeenCalledWith(unzipper.ParseOne('file.txt'));
      expect(unzipperParseOneMock).toHaveBeenCalled();
    });
  });

  describe('getFileStream', () => {
    it('should return null if the file does not exist in the zip stream', async () => {
      // Arrange
      const zipStreamMock = jest.spyOn(zipStream, 'pipe').mockReturnValue(zipStream);
      const unzipperParseOneMock = jest.spyOn(unzipper, 'ParseOne').mockReturnValue(zipStream);
      const errorEventCallback = zipStream.on.mock.calls[0][1];

      // Act
      const zip = new ZipStream(zipStream);
      const result = await zip.getFileStream('nonexistent.txt');

      // Simulate error event
      errorEventCallback();

      // Assert
      expect(result).toBeNull();
      expect(zipStreamMock).toHaveBeenCalledWith(unzipper.ParseOne('nonexistent.txt'));
      expect(unzipperParseOneMock).toHaveBeenCalled();
    });

    it('should return null if the file is a directory', async () => {
      // Arrange
      const zipStreamMock = jest.spyOn(zipStream, 'pipe').mockReturnValue(zipStream);
      const unzipperParseOneMock = jest.spyOn(unzipper, 'ParseOne').mockReturnValue(zipStream);
      const entryEventCallback = zipStream.on.mock.calls[0][1];

      // Act
      const zip = new ZipStream(zipStream);
      const promise = zip.getFileStream('directory/');

      // Simulate entry event
      entryEventCallback({ isDirectory: jest.fn().mockReturnValue(true) });

      const result = await promise;

      // Assert
      expect(result).toBeNull();
      expect(zipStreamMock).toHaveBeenCalledWith(unzipper.ParseOne('directory/'));
      expect(unzipperParseOneMock).toHaveBeenCalled();
    });

    it('should return the file stream if the file exists in the zip stream', async () => {
      // Arrange
      const zipStreamMock = jest.spyOn(zipStream, 'pipe').mockReturnValue(zipStream);
      const unzipperParseOneMock = jest.spyOn(unzipper, 'ParseOne').mockReturnValue(zipFileStream);
      const entryEventCallback = zipStream.on.mock.calls[0][1];

      // Act
      const zip = new ZipStream(zipStream);
      const promise = zip.getFileStream('file.txt');

      // Simulate entry event
      entryEventCallback(zipEntry);

      const result = await promise;

      // Assert
      expect(result).toBe(zipFileStream);
      expect(zipStreamMock).toHaveBeenCalledWith(unzipper.ParseOne('file.txt'));
      expect(unzipperParseOneMock).toHaveBeenCalled();
    });
  });
});
