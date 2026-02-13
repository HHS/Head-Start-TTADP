import { auditLogger } from '../logger'
import { sequelize } from '../models'
import logOldRecordsCount from './dbMaintenanceCLI'

jest.mock('../logger', () => ({
  auditLogger: {
    info: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('../models', () => ({
  sequelize: {
    query: jest.fn(),
    close: jest.fn(),
  },
}))

describe('logOldRecordsCount', () => {
  const originalExitCode = process.exitCode

  beforeEach(() => {
    jest.clearAllMocks()
    process.exitCode = undefined
  })

  afterEach(() => {
    process.exitCode = originalExitCode
  })

  it('discovers tables and logs counts for each', async () => {
    sequelize.query
      // First call: table discovery from information_schema
      .mockResolvedValueOnce([[{ table_name: 'ZALActivityReports' }, { table_name: 'ZALGoals' }]])
      // Second call: count for ZALActivityReports
      .mockResolvedValueOnce([[{ count: '12' }]])
      // Third call: count for ZALGoals
      .mockResolvedValueOnce([[{ count: '0' }]])

    await logOldRecordsCount()

    expect(sequelize.query).toHaveBeenCalledTimes(3)
    // Verify table discovery query targets ZAL tables
    expect(sequelize.query).toHaveBeenNthCalledWith(1, expect.stringContaining("LIKE 'ZAL%'"))
    // Verify per-table count queries reference correct table names
    expect(sequelize.query).toHaveBeenNthCalledWith(2, expect.stringContaining('"ZALActivityReports"'))
    expect(sequelize.query).toHaveBeenNthCalledWith(3, expect.stringContaining('"ZALGoals"'))
    expect(auditLogger.info).toHaveBeenCalledWith(expect.stringContaining('ZALActivityReports'))
    expect(auditLogger.info).toHaveBeenCalledWith(expect.stringContaining('ZALGoals'))
    expect(auditLogger.error).not.toHaveBeenCalled()
  })

  it('handles empty table discovery result', async () => {
    sequelize.query.mockResolvedValueOnce([[]])

    await logOldRecordsCount()

    // Only the discovery query should run
    expect(sequelize.query).toHaveBeenCalledTimes(1)
    expect(auditLogger.error).not.toHaveBeenCalled()
  })

  it('logs errors for individual table failures without blocking others', async () => {
    sequelize.query
      .mockResolvedValueOnce([[{ table_name: 'ZALActivityReports' }, { table_name: 'ZALBadTable' }, { table_name: 'ZALGoals' }]])
      .mockResolvedValueOnce([[{ count: '3' }]])
      .mockRejectedValueOnce(new Error('permission denied'))
      .mockResolvedValueOnce([[{ count: '7' }]])

    await logOldRecordsCount()

    expect(sequelize.query).toHaveBeenCalledTimes(4)
    // Successful tables are logged
    expect(auditLogger.info).toHaveBeenCalledWith(expect.stringContaining('ZALActivityReports'))
    expect(auditLogger.info).toHaveBeenCalledWith(expect.stringContaining('ZALGoals'))
    // Failed table is logged as error with table name
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('ZALBadTable'))
    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('permission denied'))
    expect(process.exitCode).toBe(1)
  })

  it('sets exitCode when the discovery query fails', async () => {
    sequelize.query.mockRejectedValueOnce(new Error('connection refused'))

    await logOldRecordsCount()

    expect(auditLogger.error).toHaveBeenCalledWith(expect.stringContaining('connection refused'))
    expect(process.exitCode).toBe(1)
  })
})
