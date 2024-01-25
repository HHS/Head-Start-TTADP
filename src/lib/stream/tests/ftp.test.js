import * as fs from 'fs';
import FTP from 'ftp';
import FtpClient from '../ftp';

describe('FtpClient', () => {
  let ftpClient;

  beforeEach(() => {
    ftpClient = new FtpClient({
      host: 'localhost',
      port: 22,
      username: 'tta_ro',
      password: 'password',
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('connect', () => {
    it('should resolve if connection is successful', async () => {
      const connectSpy = jest.spyOn(FTP.prototype, 'connect').mockImplementation((options) => {
        expect(options.host).toBe('localhost');
        expect(options.port).toBe(22);
        expect(options.user).toBe('tta_ro');
        expect(options.password).toBe('password');
        ftpClient.client.emit('ready');
        ftpClient.client.connected = true;
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
    it('should call end method of the FTP client', async () => {
      const connectSpy = jest.spyOn(FTP.prototype, 'connect').mockImplementation((options) => {
        ftpClient.client.emit('ready');
        ftpClient.client.connected = true;
      });
      const endSpy = jest.spyOn(FTP.prototype, 'end');
      await ftpClient.connect();
      ftpClient.disconnect();

      expect(endSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('listFiles', () => {
    it('should resolve with file info list if listing is successful', async () => {
      const path = '/path/to/files';
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
        expect(fullPath).toBe(path);
        callback(null, fileList);
      });

      const result = await ftpClient.listFiles(path);

      expect(result).toEqual(fileList.map((file) => ({
        fileInfo: {
          ...file,
          path,
        },
        fullPath: `${path}/${file.name}`,
      })));
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

      const getSpy = jest.spyOn(FTP.prototype, 'get').mockImplementation((remoteFilePath, _compress, callback) => {
        expect(remoteFilePath).toBe('/path/to/file.txt');
        callback(null, stream);
      });

      const result = await ftpClient.downloadAsStream('/path/to/file.txt');

      expect(result).toBe(stream);
      expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('should reject with error if download fails', async () => {
      const getSpy = jest.spyOn(FTP.prototype, 'get').mockImplementation((remoteFilePath, _compress, callback) => {
        expect(remoteFilePath).toBe('/path/to/file.txt');
        callback(new Error('Download failed'));
      });

      await expect(ftpClient.downloadAsStream('/path/to/file.txt')).rejects.toThrowError('Download failed');
      expect(getSpy).toHaveBeenCalledTimes(1);
    });
  });
});
