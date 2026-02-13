import processFile from '../processFile'
import processRecords from '../processRecords'
import { auditLogger } from '../../../logger'
import XMLStream from '../../stream/xml'
import Hasher from '../../stream/hasher'

jest.mock('../../stream/hasher')
jest.mock('../../stream/encoding')
jest.mock('../../stream/xml')
jest.mock('../../../logger')
jest.mock('../processRecords')

describe('processFile', () => {
  const processDefinition = {
    remapDef: {},
    tableName: 'tableName',
    keys: ['key'],
    encoding: 'utf8',
  }
  const fileInfo = { date: '2022-01-01' }
  const fileStream = {
    pipe: jest.fn().mockReturnThis(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should throw an error if remapDef is not found', async () => {
    const invalidProcessDefinition = { ...processDefinition, remapDef: undefined }

    const result = await processFile(invalidProcessDefinition, fileInfo, fileStream)

    expect(result.errors).toContain('Remapping definitions not found')
    expect(auditLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Remapping definitions not found'), expect.any(Error))
  })

  it('should throw an error if tableName is not found', async () => {
    const invalidProcessDefinition = { ...processDefinition, tableName: undefined }

    const result = await processFile(invalidProcessDefinition, fileInfo, fileStream)

    expect(result.errors).toContain('Model not found')
    expect(auditLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Model not found'), expect.any(Error))
  })

  it('should throw an error if keys are not found', async () => {
    const invalidProcessDefinition = { ...processDefinition, keys: undefined }

    const result = await processFile(invalidProcessDefinition, fileInfo, fileStream)

    expect(result.errors).toContain('Keys not found')
    expect(auditLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Keys not found'), expect.any(Error))
  })

  it('should throw an error if encoding is not found', async () => {
    const invalidProcessDefinition = { ...processDefinition, encoding: undefined }

    const result = await processFile(invalidProcessDefinition, fileInfo, fileStream)

    expect(result.errors).toContain('Encoding not found')
    expect(auditLogger.log).toHaveBeenCalledWith('error', expect.stringContaining('Encoding not found'), expect.any(Error))
  })

  it('should return result', async () => {
    Hasher.prototype.getHash.mockResolvedValue('hash')
    XMLStream.prototype.initialize.mockResolvedValue(null)
    XMLStream.prototype.getObjectSchema.mockResolvedValue({})
    processRecords.mockResolvedValueOnce({
      errors: [],
    })
    const result = await processFile(processDefinition, fileInfo, fileStream)

    expect(result).toStrictEqual({ hash: 'hash', schema: {}, errors: [] })
  })

  it('handles generic error', async () => {
    Hasher.prototype.getHash.mockResolvedValue('hash')
    XMLStream.prototype.initialize.mockResolvedValue(null)
    XMLStream.prototype.getObjectSchema.mockResolvedValue({})
    processRecords.mockRejectedValueOnce(new Error('Generic error'))
    const result = await processFile(processDefinition, fileInfo, fileStream)

    expect(result).toStrictEqual({ errors: ['Generic error'] })
  })
})
