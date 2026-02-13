import * as downloadModule from '../download'
import * as processModule from '../process'
import * as recordModule from '../record'
import { download, process, moreToDownload, moreToProcess, getImportSchedules } from '..'

jest.mock('../download')
jest.mock('../process')
jest.mock('../record')

describe('index', () => {
  describe('download', () => {
    it('should initiate the download of files for the given import ID', async () => {
      const importId = 123
      const mockDownloadResult = { success: true }
      downloadModule.downloadFilesFromSource.mockResolvedValue(mockDownloadResult)

      const result = await download(importId)

      expect(downloadModule.downloadFilesFromSource).toHaveBeenCalledWith(importId, undefined)
      expect(result).toEqual(mockDownloadResult)
    })

    // Add more tests for error handling if needed
  })

  describe('process', () => {
    it('should process the ZIP file from S3 for the given import ID', async () => {
      const importId = 456
      const mockProcessResult = { processed: true }
      processModule.processZipFileFromS3.mockResolvedValue(mockProcessResult)

      const result = await process(importId)

      expect(processModule.processZipFileFromS3).toHaveBeenCalledWith(importId)
      expect(result).toEqual(mockProcessResult)
    })

    // Add more tests for error handling if needed
  })

  describe('moreToDownload', () => {
    it('should check if there are more files to download for the given import ID', async () => {
      const importId = 789
      recordModule.importHasMoreToDownload.mockResolvedValue(true)

      const result = await moreToDownload(importId)

      expect(recordModule.importHasMoreToDownload).toHaveBeenCalledWith(importId)
      expect(result).toBe(true)
    })

    // Add more tests for error handling if needed
  })

  describe('moreToProcess', () => {
    it('should check if there is more processing to be done for the given import ID', async () => {
      const importId = 1011
      recordModule.importHasMoreToProcess.mockResolvedValue(false)

      const result = await moreToProcess(importId)

      expect(recordModule.importHasMoreToProcess).toHaveBeenCalledWith(importId)
      expect(result).toBe(false)
    })

    // Add more tests for error handling if needed
  })

  describe('getImportSchedules', () => {
    it('should retrieve the import schedules', async () => {
      const mockSchedules = [
        { id: 1, name: 'Schedule 1' },
        { id: 2, name: 'Schedule 2' },
      ]
      recordModule.importSchedules.mockResolvedValue(mockSchedules)

      const result = await getImportSchedules()

      expect(recordModule.importSchedules).toHaveBeenCalled()
      expect(result).toEqual(mockSchedules)
    })

    // Add more tests for error handling if needed
  })
})
