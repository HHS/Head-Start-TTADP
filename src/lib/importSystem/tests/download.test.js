import { Readable } from 'stream'
import * as download from '../download'
import { logFileToBeCollected, setImportFileStatus } from '../record'
import SftpClient from '../../stream/sftp'
import { updateStatusByKey } from '../../../services/files'
import { auditLogger } from '../../../logger'
import { FILE_STATUSES, IMPORT_STATUSES } from '../../../constants'
import { Import } from '../../../models'

const { collectNextFile, collectServerSettings, sortFilesByFullPath, collectFilesFromSource, downloadFilesFromSource } = download

// Mock implementations and utilities
const mockStream = new Readable()

const mockHashStream = {
  pipe: jest.fn().mockReturnThis(),
  getHash: jest.fn(),
}
const mockS3Client = {
  uploadFileAsStream: jest.fn(),
}

const mockRecord = {
  getPriorFile: jest.fn(),
  recordAvailableFiles: jest.fn(),
  logFileToBeCollected: jest.fn(),
  setImportFileHash: jest.fn(),
  setImportFileStatus: jest.fn(),
}

// Mocks for external dependencies
jest.mock('stream')
jest.mock('../../stream/sftp')
jest.mock('../../stream/hasher', () => jest.fn().mockImplementation(() => mockHashStream))
jest.mock('../../stream/s3', () => jest.fn().mockImplementation(() => mockS3Client))
jest.mock('../../../services/files')
jest.mock('../../../services/scanQueue', () => jest.fn())
jest.mock('../../../logger')
jest.mock('../record')
jest.mock('../../../services/files', () => ({
  updateStatusByKey: jest.fn(),
}))
jest.mock('../../../services/scanQueue', () => jest.fn())

// Helper function to create a mock file object
const createMockFile = (fullPath, fileInfo, stream) => ({
  fullPath,
  fileInfo,
  stream,
})

// Helper function to create a mock imported file object
const createMockImportedFile = (importFileId, key, attempts) => ({
  importFileId,
  key,
  attempts,
})

describe('download', () => {
  describe('collectNextFile', () => {
    beforeEach(() => {
      jest.clearAllMocks()
    })
    afterEach(() => {
      jest.clearAllMocks()
    })
    it('should return the collected files when there are no more files to collect', async () => {
      const result = await collectNextFile(1, [], { start: new Date(), limit: new Date() })
      expect(result).toEqual({
        collectedFiles: [],
        hasImportedFiles: false,
        hasRemainingFiles: false,
      })
    })
    it('should return immediately if the current time is past the limit', async () => {
      const pastLimit = new Date(new Date().getTime() - 1000)
      const result = await collectNextFile(1, [createMockFile('path/to/file', {})], {
        start: new Date(),
        limit: pastLimit,
      })
      expect(result).toEqual({
        collectedFiles: [],
        hasImportedFiles: false,
        hasRemainingFiles: true,
      })
    })

    it('should return if the average used time plus current time exceeds the limit', async () => {
      const start = new Date(new Date().getTime() - 4000)
      const limit = new Date(new Date().getTime() + 1000)
      const used = [1000, 2000, 3000] // Average = 2000
      const result = await collectNextFile(1, [createMockFile('path/to/file', {})], {
        start,
        limit,
        used,
      })
      expect(result).toHaveProperty('hasRemainingFiles', true)
    })

    it('should handle max attempts reached for a file', async () => {
      const mockFile = createMockFile('path/to/file', {})
      const mockImportedFile = createMockImportedFile(1, 'file-key', 6)
      logFileToBeCollected.mockResolvedValueOnce(mockImportedFile)

      const result = await collectNextFile(1, [mockFile], {
        start: new Date(),
        limit: new Date(new Date().getTime() + 10000),
      })
      expect(updateStatusByKey).toHaveBeenCalledWith(mockImportedFile.key, FILE_STATUSES.UPLOAD_FAILED)
      expect(setImportFileStatus).toHaveBeenCalledWith(mockImportedFile.importFileId, IMPORT_STATUSES.COLLECTION_FAILED)
      expect(result).toHaveProperty('hasRemainingFiles', false)
    })

    it('should handle successful file upload and queue for scanning', async () => {
      const mockFile = createMockFile('path/to/file', {}, Promise.resolve(mockStream))
      const mockImportedFile = createMockImportedFile(1, 'file-key', 0)
      logFileToBeCollected.mockResolvedValueOnce(mockImportedFile)
      mockHashStream.getHash.mockResolvedValueOnce('file-hash')

      const result = await collectNextFile(1, [mockFile], {
        start: new Date(),
        limit: new Date(new Date().getTime() + 10000),
      })
      expect(mockS3Client.uploadFileAsStream).toHaveBeenCalled()
      // scanQueue has been disabled because it can not handle files large enough
      // expect(addToScanQueue).toHaveBeenCalledWith({ key: mockImportedFile.key });
      // expect(updateStatusByKey).toHaveBeenCalledWith(mockImportedFile.key, FILE_STATUSES.QUEUED);
      expect(setImportFileStatus).toHaveBeenCalledWith(mockImportedFile.importFileId, IMPORT_STATUSES.COLLECTED)
      expect(result).toHaveProperty('hasRemainingFiles', false)
    })

    it('should handle error during file upload and retry', async () => {
      const mockFile = createMockFile('path/to/file', {}, Promise.resolve(mockStream))
      const mockImportedFile = createMockImportedFile(1, 'file-key', 0)
      logFileToBeCollected.mockResolvedValue(mockImportedFile)
      mockS3Client.uploadFileAsStream.mockRejectedValueOnce(new Error('Upload failed'))

      const result = await collectNextFile(1, [mockFile], {
        start: new Date(),
        limit: new Date(new Date().getTime() + 10000),
      })
      expect(auditLogger.error).toHaveBeenCalled()
      expect(updateStatusByKey).toHaveBeenCalledWith(mockImportedFile.key, FILE_STATUSES.UPLOAD_FAILED)
      expect(setImportFileStatus).toHaveBeenCalledWith(mockImportedFile.importFileId, IMPORT_STATUSES.COLLECTION_FAILED)
      expect(mockS3Client.uploadFileAsStream).toHaveBeenCalledTimes(2)
      expect(result).toHaveProperty('hasRemainingFiles', false)
    })
  })

  describe('sortFilesByFullPath', () => {
    it('should sort files by fullPath in ascending order', () => {
      const files = [{ fullPath: 'b/file2.txt' }, { fullPath: 'c/file3.txt' }, { fullPath: 'a/file1.txt' }]
      const expected = [{ fullPath: 'a/file1.txt' }, { fullPath: 'b/file2.txt' }, { fullPath: 'c/file3.txt' }]

      sortFilesByFullPath(files)

      expect(files).toEqual(expected)
    })

    it('should handle an empty array', () => {
      const files = []

      sortFilesByFullPath(files)

      expect(files).toEqual([])
    })

    it('should not change an already sorted array', () => {
      const files = [{ fullPath: 'a/file1.txt' }, { fullPath: 'b/file2.txt' }, { fullPath: 'c/file3.txt' }]
      const expected = [...files]

      sortFilesByFullPath(files)

      expect(files).toEqual(expected)
    })

    it('should handle special characters correctly', () => {
      const files = [{ fullPath: 'a-2/file3.txt' }, { fullPath: 'a-1/file2.txt' }, { fullPath: 'a/file1.txt' }]
      const expected = [{ fullPath: 'a-1/file2.txt' }, { fullPath: 'a-2/file3.txt' }, { fullPath: 'a/file1.txt' }]

      sortFilesByFullPath(files)

      expect(files).toEqual(expected)
    })

    it('should handle case sensitivity correctly', () => {
      const files = [{ fullPath: 'A/file2.txt' }, { fullPath: 'a/file1.txt' }, { fullPath: 'B/file3.txt' }, { fullPath: 'b/file4.txt' }]
      const expected = [{ fullPath: 'a/file1.txt' }, { fullPath: 'A/file2.txt' }, { fullPath: 'B/file3.txt' }, { fullPath: 'b/file4.txt' }]

      sortFilesByFullPath(files)

      expect(files).toEqual(expected)
    })

    it('should be stable for files with the same fullPath', () => {
      const file1 = { fullPath: 'a/file.txt' }
      const file2 = { fullPath: 'a/file.txt' }
      const files = [file1, file2]

      sortFilesByFullPath(files)

      expect(files).toEqual([file1, file2])
    })
  })

  describe('collectServerSettings', () => {
    const originalEnv = process.env

    beforeEach(() => {
      jest.resetModules() // Resets the module registry - the cache of all required modules
      process.env = { ...originalEnv } // Make a copy of the original process.env
    })

    afterAll(() => {
      process.env = originalEnv // Restore original process.env after all tests
    })

    it('should return the correct settings when all environment variables are set', () => {
      process.env = {
        ...process.env,
        SFTP_HOST: 'example.com',
        SFTP_PORT: '22',
        SFTP_USER: 'user',
        SFTP_PASS: 'pass',
      }
      const settings = collectServerSettings(1, {
        host: 'SFTP_HOST',
        port: 'SFTP_PORT',
        username: 'SFTP_USER',
        password: 'SFTP_PASS',
      })

      expect(settings).toEqual({
        host: 'example.com',
        port: 22,
        username: 'user',
        password: 'pass',
      })
    })

    it('should throw an error if any of the environment variables are not set', () => {
      process.env = {
        ...process.env,
        SFTP_HOST: 'example.com',
        SFTP_PORT: '22',
        SFTP_USER: 'user',
        // SFTP_PASS is missing
      }

      expect(() => {
        collectServerSettings(1, {
          host: 'SFTP_HOST',
          port: 'SFTP_PORT',
          username: 'SFTP_USER',
          password: 'SFTP_PASS',
        })
      }).toThrowError(new Error("importId: 1 settings not found in Env: 'SFTP_PASS' did not resolve to a value"))
    })

    it('should throw an error with all missing environment variables in the message', () => {
      process.env = {
        ...process.env,
        // All SFTP environment variables are missing
      }

      expect(() => {
        collectServerSettings(1, {
          host: 'SFTP_HOST',
          port: 'SFTP_PORT',
          username: 'SFTP_USER',
          password: 'SFTP_PASS',
        })
      }).toThrowError(
        new Error(
          "importId: 1 settings not found in Env: 'SFTP_HOST' did not resolve to a value, 'SFTP_PORT' did not resolve to a value, 'SFTP_USER' did not resolve to a value, 'SFTP_PASS' did not resolve to a value"
        )
      )
    })

    it('should correctly parse the port number as an integer', () => {
      process.env = {
        ...process.env,
        SFTP_HOST: 'example.com',
        SFTP_PORT: '8022', // Non-standard port as a string
        SFTP_USER: 'user',
        SFTP_PASS: 'pass',
      }
      const path = '/'
      const fileMask = undefined

      const settings = collectServerSettings(1, {
        host: 'SFTP_HOST',
        port: 'SFTP_PORT',
        username: 'SFTP_USER',
        password: 'SFTP_PASS',
      })

      expect(settings).toEqual({
        host: 'example.com',
        port: 8022, // Port should be parsed as an integer
        username: 'user',
        password: 'pass',
      })
      expect(typeof settings.port).toBe('number')
    })
  })

  // Setup SftpClient mock
  const mockConnect = jest.fn()
  const mockDisconnect = jest.fn()
  const mockListFiles = jest.fn().mockImplementation(async () => Promise.resolve([{ name: 'file.txt', stream: {} }]))
  SftpClient.prototype.connect = mockConnect
  SftpClient.prototype.disconnect = mockDisconnect
  SftpClient.prototype.listFiles = mockListFiles

  describe('collectFilesFromSource', () => {
    const importId = 1
    const timeBox = 10000 // 10 seconds
    const ftpSettings = {
      host: 'SFTP_HOST',
      port: 'SFTP_PORT',
      username: 'SFTP_USER',
      password: 'SFTP_PASS',
    }
    const path = '/test/path'
    const fileMask = '*.txt'

    const mockCollectNextFile = jest.spyOn(download, 'collectNextFile')

    beforeEach(() => {
      jest.clearAllMocks() // Resets all mocks
      // Or, if you want to reset only `collectNextFile`
      mockCollectNextFile.mockReset()
    })

    it('should throw an error if connection to FTP fails', async () => {
      const errorMessage = 'Connection failed'
      mockConnect.mockRejectedValue(new Error(errorMessage))

      process.env = {
        ...process.env,
        SFTP_HOST: 'example.com',
        SFTP_PORT: '22',
        SFTP_USER: 'user',
        SFTP_PASS: 'pass',
      }

      const mockCollectServerSettings = jest.spyOn(download, 'collectServerSettings')
      mockCollectServerSettings.mockResolvedValue(ftpSettings)

      await expect(collectFilesFromSource(importId, timeBox, ftpSettings)).rejects.toThrow(`Failed to connect to FTP: ${errorMessage}`)
    })

    it('should throw an error if listing files from FTP fails', async () => {
      const errorMessage = 'Listing failed'
      mockListFiles.mockRejectedValue(new Error(errorMessage))
      mockConnect.mockResolvedValue(undefined) // Simulate successful connection

      await expect(collectFilesFromSource(importId, timeBox, ftpSettings)).rejects.toThrow(`Failed to list files from FTP: ${errorMessage}`)
    })

    it('should collect files within the time limit', async () => {
      const mockFtpClient = {
        connect: jest.fn(),
        listFiles: jest.fn().mockResolvedValue([]),
        disconnect: jest.fn(),
      }
      process.env = {
        ...process.env,
        SFTP_HOST: 'example.com',
        SFTP_PORT: '22',
        SFTP_USER: 'user',
        SFTP_PASS: 'pass',
      }

      const mockCollectServerSettings = jest.spyOn(download, 'collectServerSettings')
      jest.mock('../../stream/sftp', () => jest.fn().mockImplementation(() => mockFtpClient))
      mockCollectServerSettings.mockResolvedValue(ftpSettings)

      mockConnect.mockResolvedValue(undefined) // Simulate successful connection
      mockListFiles.mockResolvedValue([
        { fullPath: '/test/path/file1.txt', fileInfo: {}, stream: Promise.resolve(new Readable()) },
        { fullPath: '/test/path/file2.txt', fileInfo: {}, stream: Promise.resolve(new Readable()) },
      ])

      mockCollectNextFile.mockResolvedValue({
        collectedFiles: ['/test/path/file1.txt'],
        hasRemainingFiles: false,
      })
      const mockImportedFile = createMockImportedFile(1, 'file-key', 2)
      logFileToBeCollected.mockResolvedValue(mockImportedFile)

      const collectedFiles = await collectFilesFromSource(importId, timeBox, ftpSettings, path, fileMask)
      expect(collectedFiles.length).toEqual(2)
      expect(mockConnect).toHaveBeenCalled()
      expect(mockListFiles).toHaveBeenCalledWith({
        path,
        fileMask,
        priorFile: undefined,
        includeStream: true,
      })
      expect(mockDisconnect).toHaveBeenCalled()
    })

    it('should collect files from the FTP server', async () => {
      mockListFiles.mockResolvedValue([])
      const collectedFiles = await collectFilesFromSource(importId, timeBox, ftpSettings, path, fileMask)
      expect(collectedFiles).toEqual([])
      expect(mockConnect).toHaveBeenCalled()
      expect(mockListFiles).toHaveBeenCalledWith({
        path,
        fileMask,
        priorFile: undefined,
        includeStream: true,
      })
      expect(mockDisconnect).toHaveBeenCalled()
    })
  })

  describe('downloadFilesFromSource', () => {
    const mockImportFindOne = jest.spyOn(Import, 'findOne')
    const mockImportedFile = createMockImportedFile(1, 'file-key', 6)
    logFileToBeCollected.mockResolvedValue(mockImportedFile)

    const mockImportId = 1
    const mockTimeBox = 300000 // 5 minutes in milliseconds
    const mockImportFileData = {
      importId: mockImportId,
      ftpSettings: {
        host: 'ITAMS_MD_HOST',
        port: 'ITAMS_MD_PORT',
        username: 'ITAMS_MD_USERNAME',
        password: 'ITAMS_MD_PASSWORD',
      },
      path: '/remote/path/',
      fileMask: '*.txt',
    }

    beforeAll(() => {
      process.env.ITAMS_MD_HOST = 'example.com'
      process.env.ITAMS_MD_PORT = '22'
      process.env.ITAMS_MD_USERNAME = 'username'
      process.env.ITAMS_MD_PASSWORD = 'password'
    })

    afterAll(() => {
      jest.restoreAllMocks()
    })

    it('should call Import.findOne with the correct parameters', async () => {
      mockImportFindOne.mockResolvedValue(mockImportFileData)
      await downloadFilesFromSource(mockImportId)
      expect(mockImportFindOne).toHaveBeenCalledWith({
        attributes: [['id', 'importId'], 'ftpSettings', 'path', 'fileMask'],
        where: {
          id: mockImportId,
        },
        raw: true,
      })
    })

    it('should return the result from collectFilesFromSource', async () => {
      mockImportFindOne.mockResolvedValue(mockImportFileData)
      const result = await downloadFilesFromSource(mockImportId, mockTimeBox)
      expect(result).toStrictEqual([])
      expect(mockDisconnect).toHaveBeenCalled()
    })

    it('should handle the case when Import.findOne returns null', async () => {
      mockImportFindOne.mockResolvedValue(null)
      await expect(downloadFilesFromSource(mockImportId, mockTimeBox)).rejects.toThrow()
    })
  })
})
