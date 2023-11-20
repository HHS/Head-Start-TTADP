import * as fs from 'fs';
import * as FTP from 'ftp';
import FtpClient from '../ftp';

describe('FtpClient', () => {
  let ftpClient;

  beforeEach(() => {
    ftpClient = new FtpClient('localhost', 21, 'username', 'password');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('connect', () => {
    it('should resolve if connection is successful', async () => {
      const connectSpy = jest.spyOn(FTP.prototype, 'connect').mockImplementation((config) => {
        expect(config.host).toBe('localhost');
        expect(config.port).toBe(21);
        expect(config.user).toBe('username');
        expect(config.password).toBe('password');
        ftpClient.client.emit('ready');
      });

      await expect(ftpClient.connect()).resolves.toBeUndefined();
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject if connection fails', async () => {
      const connectSpy = jest.spyOn(FTP.prototype, 'connect').mockImplementation((config) => {
        ftpClient.client.emit('error', new Error('Connection failed'));
      });

      await expect(ftpClient.connect()).rejects.toThrowError('Connection failed');
      expect(connectSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('disconnect', () => {
    it('should call end method of the FTP client', () => {
      const endSpy = jest.spyOn(FTP.prototype, 'end');

      ftpClient.disconnect();

      expect(endSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('listFiles', () => {
    it('should resolve with file info list if listing is successful', async () => {
      const fileList = [
        {
          path: '',
          name: 'file1.txt',
          type: 'file',
          size: 100,
          date: new Date(),
        },
        {
          path: '',
          name: 'file2.txt',
          type: 'file',
          size: 200,
          date: new Date(),
        },
      ];

      const listSpy = jest.spyOn(FTP.prototype, 'list').mockImplementation((fullPath, callback) => {
        expect(fullPath).toBe('/path/to/files');
        callback(null, fileList);
      });

      const result = await ftpClient.listFiles('/path/to/files');

      expect(result).toEqual(fileList);
      expect(listSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject with error if listing fails', async () => {
      const listSpy = jest.spyOn(FTP.prototype, 'list').mockImplementation((fullPath, callback) => {
        expect(fullPath).toBe('/path/to/files');
        callback(new Error('Listing failed'));
      });

      await expect(ftpClient.listFiles('/path/to/files')).rejects.toThrowError('Listing failed');
      expect(listSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('downloadAsStream', () => {
    it('should resolve with read stream if download is successful', async () => {
      const stream = fs.createReadStream('test.txt');

      const getSpy = jest.spyOn(FTP.prototype, 'get').mockImplementation((remoteFilePath, callback) => {
        expect(remoteFilePath).toBe('/path/to/file.txt');
        callback(null, stream);
      });

      const result = await ftpClient.downloadAsStream('/path/to/file.txt');

      expect(result).toBe(stream);
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject with error if download fails', async () => {
      const getSpy = jest.spyOn(FTP.prototype, 'get').mockImplementation((remoteFilePath, callback) => {
        expect(remoteFilePath).toBe('/path/to/file.txt');
        callback(new Error('Download failed'));
      });

      await expect(ftpClient.downloadAsStream('/path/to/file.txt')).rejects.toThrowError('Download failed');
      expect(getSpy).toHaveBeenCalledTimes(1);
    });
  });
});
