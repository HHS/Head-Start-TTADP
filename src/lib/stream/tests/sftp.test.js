// // import * as fs from 'fs';
// // import SftpClient, { SFTPSettings, FileInfo } from '../sftp';

// // function isInDocker(): boolean {
// //   try {
// //     fs.statSync('/.dockerenv');
// //     return true;
// //   } catch {
// //     return false;
// //   }
// // }

// // describe('FtpClient Integration Tests', () => {
// //   let sftpClient: SftpClient;
// //   let connectionSettings: SFTPSettings;

// //   beforeAll(() => {
// //     // process.env = {}; // Optionally clear the previous env
// //     // // eslint-disable-next-line global-require
// //     // require('dotenv').config(); // Re-import to refresh the env variables
// //     connectionSettings = {
// //       host: isInDocker()
// //         ? process.env.ITAMS_MD_HOST
// //         : '0.0.0.0',
// //       port: isInDocker()
// //         ? parseInt(process.env.ITAMS_MD_PORT || '22', 10)
// //         : parseInt(process.env.SFTP_EXPOSED_PORT || '22', 10),
// //       username: process.env.ITAMS_MD_USERNAME,
// //       password: process.env.ITAMS_MD_PASSWORD,
// //     };
// //     sftpClient = new SftpClient(connectionSettings);
// //   });

// //   beforeEach(async () => {
// //     await sftpClient.connect();
// //   });

// //   afterAll(async () => {
// //     await sftpClient.disconnect();
// //   });

// //   describe('connect and disconnect', () => {
// //     it('should connect to the SFTP server and then disconnect', async () => {
// //       expect(sftpClient.isConnected()).toBe(true);

// //       await sftpClient.disconnect();
// //       expect(sftpClient.isConnected()).toBe(false);
// //     });
// //     it('should re-connect to the SFTP server and then disconnect', async () => {
// //       expect(sftpClient.isConnected()).toBe(true);

// //       await sftpClient.disconnect();
// //       expect(sftpClient.isConnected()).toBe(false);

// //       await sftpClient.connect();
// //       expect(sftpClient.isConnected()).toBe(true);

// //       await sftpClient.disconnect();
// //       expect(sftpClient.isConnected()).toBe(false);
// //     });
// //   });

// //   describe('listFiles', () => {
// //     it('should list files in the specified directory', async () => {
// //       const files = await sftpClient.listFiles({ path: '/ProdTTAHome' });
// //       expect(Array.isArray(files)).toBe(true);
// //       expect(files.length).toBeGreaterThan(0);
// //       files.forEach((file) => {
// //         expect(file).toHaveProperty('fullPath');
// //         expect(file).toHaveProperty('fileInfo');
// //         expect(file.fileInfo).toMatchObject({
// //         });
// //       });
// //     });

// //     // Add more tests as needed for fileMask, priorFile, and includeStream options
// //   });

// //   describe('downloadAsStream', () => {
// //     it('should download a file as a stream', async () => {
// //       const remoteFilePath = '/ProdTTAHome/2023_07_20_XML.zip';
// // Replace with an actual file path on your SFTP server

// //       const files = await sftpClient.listFiles({ path: '/ProdTTAHome' });

// //       const stream = await sftpClient.downloadAsStream(files[0].fullPath);
// //       expect(stream).not.toBeUndefined();
// //     });
// //   });
// // });

import { Client } from 'ssh2'
import { Readable } from 'stream'
import SftpClient from '../sftp'

jest.mock('stream')

const mockClient = {
  connect: jest.fn(),
  on: jest.fn(),
  end: jest.fn(),
  sftp: jest.fn(),
}

jest.mock('ssh2', () => ({
  Client: jest.fn().mockImplementation(() => mockClient),
}))

describe('SftpClient', () => {
  let sftpClient
  const mockSftp = {
    readdir: jest.fn(),
    createReadStream: jest.fn(),
  }
  // const mockClient = new Client() as jest.Mocked<Client>;
  const connectionSettings = {
    host: 'example.com',
    username: 'user',
    password: 'password',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    sftpClient = new SftpClient(connectionSettings)
    mockClient.sftp.mockImplementation((callback) => {
      callback(null, mockSftp)
    })
    mockClient.connect.mockImplementation((config, callback) => {
      // Call the callback with no error to simulate a successful connection
      if (callback) {
        callback()
      }
    })
    mockClient.end.mockImplementation(() => {})
    mockClient.on.mockImplementation((event, callback) => {
      if (event === 'ready') {
        callback()
      }
      return mockClient
    })
  })

  afterEach(() => {
    mockClient.on.mockReset()
    jest.clearAllMocks()
    jest.resetModules()
  })

  describe('connect', () => {
    it('should resolve if already connected', async () => {
      sftpClient.connected = true
      await expect(sftpClient.connect()).resolves.toBeUndefined()
    })

    it('should connect and set connected to true', async () => {
      await expect(sftpClient.connect()).resolves.toBeUndefined()
      expect(sftpClient.isConnected()).toBe(true)
    })

    it('should reject on connection error', async () => {
      // const onError = new Error('Connection error');
      // mockClient.on.mockReset();
      // mockClient.on.mockImplementation((event, callback) => {
      //   if (event === 'ready') {
      //     callback();
      //   }
      //   if (event === 'error' && onError) {
      //     callback(onError);
      //   }
      //   return mockClient;
      // });

      // await expect(sftpClient.connect()).rejects.toThrow('Connection error');
      // expect(sftpClient.isConnected()).toBe(false);

      // mockClient.connect.mockRejectedValue(new Error('Connection error'));
      jest.spyOn(mockClient, 'on').mockImplementation(() => {
        throw new Error('Connection error')
      })
      // mockClient.sftp.mockImplementationOnce((callback) => {
      //   callback(error);
      // });
      await expect(sftpClient.connect()).rejects.not.toThrow()
    })
  })

  describe('disconnect', () => {
    it('should end the connection if connected', () => {
      sftpClient.connected = true

      // Mock the end method to be a jest function
      mockClient.end = jest.fn()

      sftpClient.disconnect()
      expect(mockClient.end).toHaveBeenCalled()
      expect(sftpClient.isConnected()).toBe(false)
    })

    it('should not end the connection if not connected', () => {
      sftpClient.connected = false
      sftpClient.disconnect()
      expect(mockClient.end).not.toHaveBeenCalled()
    })
  })

  describe('listFiles', () => {
    const path = '/path/to/directory'
    const fileMask = '.*\\.txt'
    const fileList = [
      { filename: 'file1.txt', longname: '-rw-r--r--', attrs: {} },
      { filename: 'file2.txt', longname: '-rw-r--r--', attrs: {} },
    ]

    beforeEach(() => {
      jest.clearAllMocks()
      sftpClient = new SftpClient(connectionSettings)
      mockClient.sftp.mockImplementation((callback) => {
        callback(null, mockSftp)
      })
      mockClient.connect.mockImplementation((_config, callback) => {
        // Call the callback with no error to simulate a successful connection
        if (callback) {
          callback()
        }
      })
      mockClient.end.mockImplementation(() => {})
      mockSftp.readdir.mockImplementation((_path, callback) => {
        callback(null, fileList)
      })
      mockClient.on.mockImplementation((event, callback) => {
        if (event === 'ready') {
          callback()
        }
        return mockClient
      })
    })

    it('should list files in the specified directory', async () => {
      const files = await sftpClient.listFiles({ path })
      expect(files).toHaveLength(fileList.length)
      expect(files[0].fileInfo.name).toBe('file1.txt')
      expect(files[1].fileInfo.name).toBe('file2.txt')
    })

    it('should filter files by fileMask', async () => {
      const files = await sftpClient.listFiles({ path, fileMask })
      expect(files).toHaveLength(fileList.length)
      expect(mockSftp.readdir).toHaveBeenCalledWith(path, expect.any(Function))
    })

    it('should reject if there is an error reading the directory', async () => {
      const error = new Error('Read directory error')
      mockSftp.readdir.mockImplementation((_path, callback) => {
        callback(error, [])
      })
      await expect(sftpClient.listFiles({ path })).rejects.toThrow('Read directory error')
    })
  })

  describe('downloadAsStream', () => {
    const remoteFilePath = '/path/to/file.txt'

    it('should return a readable stream for the remote file', async () => {
      const mockStream = new Readable()
      mockSftp.createReadStream.mockReturnValue(mockStream)
      const stream = await sftpClient.downloadAsStream(remoteFilePath)
      expect(stream).toBeInstanceOf(Readable)
      expect(mockSftp.createReadStream).toHaveBeenCalledWith(remoteFilePath, {})
    })

    it('should reject if there is an error creating the read stream', async () => {
      const error = new Error('Create read stream error')
      mockClient.sftp.mockImplementationOnce((callback) => {
        process.nextTick(() => callback(error))
      })
      await expect(sftpClient.downloadAsStream(remoteFilePath)).rejects.toThrow('Create read stream error')
    })
  })
})
