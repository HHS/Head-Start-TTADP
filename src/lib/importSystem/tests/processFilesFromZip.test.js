/* eslint-disable max-len */
import processFilesFromZip from '../processFilesFromZip'
import { setImportDataFileStatusByPath, updateAvailableDataFileMetadata } from '../record'
import { IMPORT_DATA_STATUSES, IMPORT_STATUSES } from '../../../constants'
import { auditLogger } from '../../../logger'
import processFile from '../processFile'
import ZipStream from '../../stream/zip'

jest.mock('../record')
jest.mock('../../../logger')
jest.mock('../processFile')
jest.mock('../../stream/zip')

describe('processFilesFromZip', () => {
  const importFileId = 1
  let zipClient

  const filesToProcess = [
    { name: 'file1.xml', path: 'path/to/file1.xml' },
    { name: 'file2.xml', path: 'path/to/file2.xml' },
  ]
  const processDefinitions = [
    {
      fileName: 'file1.xml',
      remapDef: {},
      tableName: 'table1',
      keys: ['key1'],
      encoding: 'utf8',
    },
    {
      fileName: 'file2.xml',
      remapDef: {},
      tableName: 'table2',
      keys: ['key2'],
      encoding: 'utf8',
    },
  ]

  beforeEach(() => {
    zipClient = new ZipStream()
    zipClient.getFileStream.mockImplementation(() => ({}))
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('exits early if processDefinitions is empty', async () => {
    await processFilesFromZip(importFileId, zipClient, filesToProcess, [])

    expect(setImportDataFileStatusByPath).not.toHaveBeenCalled()
    expect(processFile).not.toHaveBeenCalled()
    expect(updateAvailableDataFileMetadata).not.toHaveBeenCalled()
    expect(auditLogger.log).not.toHaveBeenCalled()
  })

  it('throws an error if there is a failure to get a file stream', async () => {
    zipClient.getFileStream.mockImplementation(() => null)

    await processFilesFromZip(
      importFileId,
      zipClient,
      filesToProcess,
      processDefinitions.map((def) => ({ ...def }))
    )

    expect(updateAvailableDataFileMetadata).toHaveBeenCalledTimes(2)
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(importFileId, { name: 'file1.xml' }, IMPORT_DATA_STATUSES.PROCESSING_FAILED, {
      recordCounts: { errors: { 'Failed to get stream from file1.xml': 1 } },
    })
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(importFileId, { name: 'file2.xml' }, IMPORT_DATA_STATUSES.PROCESSING_FAILED, {
      recordCounts: { errors: { 'Failed to get stream from file2.xml': 1 } },
    })
  })

  it('should process all files successfully', async () => {
    processFile.mockImplementation(() => ({
      errors: [],
      schema: {},
      hash: 'hash',
      inserts: [],
      updates: [],
      deletes: [],
    }))

    await processFilesFromZip(
      importFileId,
      zipClient,
      filesToProcess,
      processDefinitions.map((def) => ({ ...def }))
    )

    expect(setImportDataFileStatusByPath).toHaveBeenCalledTimes(2)
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
    expect(processFile).toHaveBeenCalledTimes(2)
    expect(processFile).toHaveBeenCalledWith(
      {
        encoding: 'utf8',
        fileName: 'file2.xml',
        keys: ['key2'],
        remapDef: {},
        tableName: 'table2',
      },
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      {}
    )
    expect(processFile).toHaveBeenCalledWith(
      {
        encoding: 'utf8',
        fileName: 'file1.xml',
        keys: ['key1'],
        remapDef: {},
        tableName: 'table1',
      },
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      {}
    )
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledTimes(2)
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      IMPORT_STATUSES.PROCESSED,
      {
        hash: 'hash',
        recordCounts: {
          deletes: 0,
          errors: {},
          inserts: 0,
          updates: 0,
        },
        schema: {},
      }
    )
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_STATUSES.PROCESSED,
      {
        hash: 'hash',
        recordCounts: {
          deletes: 0,
          errors: {},
          inserts: 0,
          updates: 0,
        },
        schema: {},
      }
    )
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
  })

  it('handles default values returned from processFile', async () => {
    processFile.mockImplementation(() => ({
      inserts: [],
      updates: [],
      deletes: [],
      errors: [],
    }))

    await processFilesFromZip(
      importFileId,
      zipClient,
      filesToProcess,
      processDefinitions.map((def) => ({ ...def }))
    )

    expect(setImportDataFileStatusByPath).toHaveBeenCalledTimes(2)
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
    expect(processFile).toHaveBeenCalledTimes(2)
    expect(processFile).toHaveBeenCalledWith(
      {
        encoding: 'utf8',
        fileName: 'file2.xml',
        keys: ['key2'],
        remapDef: {},
        tableName: 'table2',
      },
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      {}
    )
    expect(processFile).toHaveBeenCalledWith(
      {
        encoding: 'utf8',
        fileName: 'file1.xml',
        keys: ['key1'],
        remapDef: {},
        tableName: 'table1',
      },
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      {}
    )
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledTimes(2)
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      IMPORT_STATUSES.PROCESSED,
      {
        hash: null,
        recordCounts: {
          deletes: 0,
          errors: {},
          inserts: 0,
          updates: 0,
        },
        schema: null,
      }
    )
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_STATUSES.PROCESSED,
      {
        hash: null,
        recordCounts: {
          deletes: 0,
          errors: {},
          inserts: 0,
          updates: 0,
        },
        schema: null,
      }
    )
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
  })

  it('runs fns returned from processFile', async () => {
    const insert = jest.fn()
    const update = jest.fn()
    const del = jest.fn()

    processFile.mockImplementation(() => ({
      inserts: [insert],
      updates: [update],
      deletes: [del],
      errors: ['Failure', 'Failure', 'Near-failure'],
    }))

    const resolve = jest.spyOn(Promise, 'resolve')

    await processFilesFromZip(
      importFileId,
      zipClient,
      filesToProcess,
      processDefinitions.map((def) => ({ ...def }))
    )

    expect(resolve).toHaveBeenCalledWith(insert)
    expect(resolve).toHaveBeenCalledWith(update)
    expect(resolve).toHaveBeenCalledWith(del)

    expect(updateAvailableDataFileMetadata).toHaveBeenCalledTimes(2)
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      IMPORT_STATUSES.PROCESSED,
      {
        hash: null,
        recordCounts: {
          deletes: 1,
          errors: {
            Failure: 2,
            'Near-failure': 1,
          },
          inserts: 1,
          updates: 1,
        },
        schema: null,
      }
    )
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_STATUSES.PROCESSED,
      {
        hash: null,
        recordCounts: {
          deletes: 1,
          errors: {
            Failure: 2,
            'Near-failure': 1,
          },
          inserts: 1,
          updates: 1,
        },
        schema: null,
      }
    )
  })

  it('should handle errors when processing a file', async () => {
    processFile.mockRejectedValueOnce(new Error('Processing error')).mockResolvedValueOnce({
      errors: [],
      schema: {},
      hash: 'hash',
      inserts: [],
      updates: [],
      deletes: [],
    })

    await processFilesFromZip(
      importFileId,
      zipClient,
      filesToProcess,
      processDefinitions.map((def) => ({ ...def }))
    )

    expect(setImportDataFileStatusByPath).toHaveBeenCalledTimes(2)
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
    expect(processFile).toHaveBeenCalledTimes(2)
    expect(processFile).toHaveBeenCalledWith(
      {
        encoding: 'utf8',
        fileName: 'file2.xml',
        keys: ['key2'],
        remapDef: {},
        tableName: 'table2',
      },
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      {}
    )
    expect(processFile).toHaveBeenCalledWith(
      {
        encoding: 'utf8',
        fileName: 'file1.xml',
        keys: ['key1'],
        remapDef: {},
        tableName: 'table1',
      },
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      {}
    )
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledTimes(2)
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(importFileId, { name: 'file2.xml' }, IMPORT_STATUSES.PROCESSING_FAILED, {
      recordCounts: {
        errors: {
          'Processing error': 1,
        },
      },
    })
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_STATUSES.PROCESSED,
      {
        hash: 'hash',
        recordCounts: {
          deletes: 0,
          errors: {},
          inserts: 0,
          updates: 0,
        },
        schema: {},
      }
    )
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file1.xml', path: 'path/to/file1.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
    expect(setImportDataFileStatusByPath).toHaveBeenCalledWith(
      importFileId,
      { name: 'file2.xml', path: 'path/to/file2.xml' },
      IMPORT_DATA_STATUSES.PROCESSING
    )
  })

  it('should handle cases where there are no files to process', async () => {
    await processFilesFromZip(
      importFileId,
      zipClient,
      [],
      processDefinitions.map((def) => ({ ...def }))
    )

    expect(setImportDataFileStatusByPath).not.toHaveBeenCalled()
    expect(processFile).not.toHaveBeenCalled()
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledTimes(2)
    expect(updateAvailableDataFileMetadata).toHaveBeenCalledWith(importFileId, undefined, IMPORT_STATUSES.PROCESSING_FAILED, {})
    expect(auditLogger.log).not.toHaveBeenCalled()
  })
})
