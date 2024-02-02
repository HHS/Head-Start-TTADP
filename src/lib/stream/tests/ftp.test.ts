import * as fs from 'fs';
import FtpClient, { FTPSettings, FileInfo } from '../ftp';

function isInDocker(): boolean {
  try {
    fs.statSync('/.dockerenv');
    return true;
  } catch {
    return false;
  }
}

describe('FtpClient Integration Tests', () => {
  let ftpClient: FtpClient;
  let connectionSettings: FTPSettings;

  beforeAll(() => {
    // process.env = {}; // Optionally clear the previous env
    // // eslint-disable-next-line global-require
    // require('dotenv').config(); // Re-import to refresh the env variables
    connectionSettings = {
      host: isInDocker()
        ? process.env.ITAMS_MD_HOST
        : '0.0.0.0',
      port: isInDocker()
        ? parseInt(process.env.ITAMS_MD_PORT || '22', 10)
        : parseInt(process.env.SFTP_EXPOSED_PORT || '22', 10),
      username: process.env.ITAMS_MD_USERNAME,
      password: process.env.ITAMS_MD_PASSWORD,
    };
    console.log(connectionSettings);
    ftpClient = new FtpClient(connectionSettings);
  });

  afterAll(async () => {
    await ftpClient.disconnect();
  });

  describe('connect and disconnect', () => {
    it('should connect to the SFTP server and then disconnect', async () => {
      await ftpClient.connect();
      expect(ftpClient.isConnected()).toBe(true);

      await ftpClient.disconnect();
      expect(ftpClient.isConnected()).toBe(false);
    });
    it('should re-connect to the SFTP server and then disconnect', async () => {
      await ftpClient.connect();
      expect(ftpClient.isConnected()).toBe(true);

      await ftpClient.disconnect();
      expect(ftpClient.isConnected()).toBe(false);

      await ftpClient.connect();
      expect(ftpClient.isConnected()).toBe(true);

      await ftpClient.disconnect();
      expect(ftpClient.isConnected()).toBe(false);
    });
  });

  describe('listFiles', () => {
    it('should list files in the specified directory', async () => {
      await ftpClient.connect();
      const files = await ftpClient.listFiles({ path: '/ProdTTAHome' });
      expect(Array.isArray(files)).toBe(true);
      files.forEach((file) => {
        expect(file).toHaveProperty('fullPath');
        expect(file).toHaveProperty('fileInfo');
        expect(file.fileInfo).toMatchObject({
        });
      });
    });

    // Add more tests as needed for fileMask, priorFile, and includeStream options
  });

  describe('downloadAsStream', () => {
    it('should download a file as a stream', async () => {
      await ftpClient.connect();
      const remoteFilePath = '/ProdTTAHome/2023_07_20_XML.zip'; // Replace with an actual file path on your SFTP server

      const stream = await ftpClient.downloadAsStream(remoteFilePath);
      expect(stream).toBeDefined();
    });
  });
});
