import * as fs from 'fs';
import SftpClient, { SFTPSettings, FileInfo } from '../sftp';

function isInDocker(): boolean {
  try {
    fs.statSync('/.dockerenv');
    return true;
  } catch {
    return false;
  }
}

describe('FtpClient Integration Tests', () => {
  let sftpClient: SftpClient;
  let connectionSettings: SFTPSettings;

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
    sftpClient = new SftpClient(connectionSettings);
  });

  afterAll(async () => {
    await sftpClient.disconnect();
  });

  describe('connect and disconnect', () => {
    it('should connect to the SFTP server and then disconnect', async () => {
      await sftpClient.connect();
      expect(sftpClient.isConnected()).toBe(true);

      await sftpClient.disconnect();
      expect(sftpClient.isConnected()).toBe(false);
    });
    it('should re-connect to the SFTP server and then disconnect', async () => {
      await sftpClient.connect();
      expect(sftpClient.isConnected()).toBe(true);

      await sftpClient.disconnect();
      expect(sftpClient.isConnected()).toBe(false);

      await sftpClient.connect();
      expect(sftpClient.isConnected()).toBe(true);

      await sftpClient.disconnect();
      expect(sftpClient.isConnected()).toBe(false);
    });
  });

  describe('listFiles', () => {
    it('should list files in the specified directory', async () => {
      await sftpClient.connect();
      const files = await sftpClient.listFiles({ path: '/ProdTTAHome' });
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
      await sftpClient.connect();
      const remoteFilePath = '/ProdTTAHome/2023_07_20_XML.zip'; // Replace with an actual file path on your SFTP server

      const stream = await sftpClient.downloadAsStream(remoteFilePath);
      expect(stream).toBeDefined();
    });
  });
});
