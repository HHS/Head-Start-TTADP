import { Readable } from 'stream'
import { Upload } from '@aws-sdk/lib-storage'
import S3Client from '../s3'
import { auditLogger } from '../../../logger'

const mockSend = jest.fn()
const commandCalls = []

// Mock AWS SDK client and commands used by stream S3 wrapper
jest.mock('@aws-sdk/client-s3', () => {
  const makeCommand = (name) =>
    jest.fn((params) => {
      const cmd = { name, params }
      commandCalls.push(cmd)
      return cmd
    })

  return {
    S3Client: jest.fn(() => ({ send: mockSend })),
    GetObjectCommand: makeCommand('GetObjectCommand'),
    HeadObjectCommand: makeCommand('HeadObjectCommand'),
    DeleteObjectCommand: makeCommand('DeleteObjectCommand'),
    ListObjectsV2Command: makeCommand('ListObjectsV2Command'),
  }
})

// Mock @aws-sdk/lib-storage Upload
jest.mock('@aws-sdk/lib-storage', () => {
  const doneMock = jest.fn().mockResolvedValue(undefined)
  const UploadMock = jest.fn().mockImplementation(() => ({
    done: doneMock,
  }))
  return { Upload: UploadMock }
})

// Mock logger used by the module under test
jest.mock('../../../logger', () => ({
  auditLogger: {
    error: jest.fn(),
  },
}))

function streamToString(stream) {
  return new Promise((resolve, reject) => {
    const chunks = []
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('error', (err) => reject(err))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
  })
}

describe('S3Client', () => {
  const BUCKET = 'test-bucket'

  beforeEach(() => {
    jest.clearAllMocks()
    mockSend.mockReset()
    commandCalls.length = 0
  })

  describe('uploadFileAsStream', () => {
    it('calls Upload and waits for done()', async () => {
      const uploadDone = jest.fn().mockResolvedValue(undefined)
      Upload.mockImplementation(() => ({ done: uploadDone }))

      const client = new S3Client({ s3Bucket: BUCKET, s3Config: {} })
      const stream = Readable.from(Buffer.from('hello'))
      await client.uploadFileAsStream('file.txt', stream)

      expect(Upload).toHaveBeenCalled()
      expect(uploadDone).toHaveBeenCalled()
    })

    it('logs and rethrows when upload fails', async () => {
      const error = new Error('upload failed')
      const uploadDone = jest.fn().mockRejectedValue(error)
      Upload.mockImplementation(() => ({ done: uploadDone }))

      const client = new S3Client({ s3Bucket: BUCKET, s3Config: {} })
      const stream = Readable.from(Buffer.from('data'))

      await expect(client.uploadFileAsStream('file.txt', stream)).rejects.toThrow(error)
      expect(auditLogger.error).toHaveBeenCalledWith('Error uploading file:', error)
    })
  })

  describe('downloadFileAsStream', () => {
    it('returns a readable stream with the object body', async () => {
      const body = Buffer.from('downloaded-content')
      mockSend.mockResolvedValue({ Body: body })

      const client = new S3Client({ s3Bucket: BUCKET, s3Config: {} })
      const stream = await client.downloadFileAsStream('file.txt')
      const text = await streamToString(stream)

      expect(mockSend).toHaveBeenCalledWith(commandCalls[0])
      expect(commandCalls[0]).toEqual({
        name: 'GetObjectCommand',
        params: { Bucket: BUCKET, Key: 'file.txt' },
      })
      expect(text).toBe(body.toString('utf8'))
    })

    it('logs and rethrows when getObject fails', async () => {
      const error = new Error('not found')
      mockSend.mockRejectedValue(error)

      const client = new S3Client({ s3Bucket: BUCKET, s3Config: {} })

      await expect(client.downloadFileAsStream('missing.txt')).rejects.toThrow(error)
      expect(auditLogger.error).toHaveBeenCalledWith('Error downloading file:', error)
    })
  })

  describe('getFileMetadata', () => {
    it('returns headObject response', async () => {
      const meta = { ContentLength: 42 }
      mockSend.mockResolvedValue(meta)

      const client = new S3Client({ s3Bucket: BUCKET, s3Config: {} })
      const response = await client.getFileMetadata('file.txt')

      expect(response).toBe(meta)
      expect(commandCalls[0]).toEqual({
        name: 'HeadObjectCommand',
        params: { Bucket: BUCKET, Key: 'file.txt' },
      })
    })

    it('logs and rethrows when headObject fails', async () => {
      const error = new Error('head failed')
      mockSend.mockRejectedValue(error)

      const client = new S3Client({ s3Bucket: BUCKET, s3Config: {} })

      await expect(client.getFileMetadata('file.txt')).rejects.toThrow(error)
      expect(auditLogger.error).toHaveBeenCalledWith('Error getting file metadata:', error)
    })
  })

  describe('deleteFile', () => {
    it('calls deleteObject and resolves', async () => {
      mockSend.mockResolvedValue({ status: 'ok' })

      const client = new S3Client({ s3Bucket: BUCKET, s3Config: {} })
      await expect(client.deleteFile('file.txt')).resolves.toEqual({ status: 'ok' })
      expect(commandCalls[0]).toEqual({
        name: 'DeleteObjectCommand',
        params: { Bucket: BUCKET, Key: 'file.txt' },
      })
    })

    it('logs and rethrows when deleteObject fails', async () => {
      const error = new Error('delete failed')
      mockSend.mockRejectedValue(error)

      const client = new S3Client({ s3Bucket: BUCKET, s3Config: {} })

      await expect(client.deleteFile('file.txt')).rejects.toThrow(error)
      expect(auditLogger.error).toHaveBeenCalledWith('Error deleting file:', error)
    })
  })

  describe('listFiles', () => {
    it('returns listObjectsV2 response', async () => {
      const list = { Contents: [{ Key: 'a' }, { Key: 'b' }] }
      mockSend.mockResolvedValue(list)

      const client = new S3Client({ s3Bucket: BUCKET, s3Config: {} })
      const response = await client.listFiles()

      expect(response).toBe(list)
      expect(commandCalls[0]).toEqual({
        name: 'ListObjectsV2Command',
        params: { Bucket: BUCKET },
      })
    })

    it('logs and rethrows when listObjectsV2 fails', async () => {
      const error = new Error('list failed')
      mockSend.mockRejectedValue(error)

      const client = new S3Client({ s3Bucket: BUCKET, s3Config: {} })

      await expect(client.listFiles()).rejects.toThrow(error)
      expect(auditLogger.error).toHaveBeenCalledWith('Error listing files:', error)
    })
  })
})
