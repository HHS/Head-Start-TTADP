import { DECIMAL_BASE } from '@ttahub/common'
import dataValidation, { countAndLastUpdated, runSelectQuery } from './dataValidation'
import { sequelize, SiteAlert } from '../models'
import { auditLogger } from '../logger'

jest.mock('../logger')

describe('dataValidation', () => {
  afterAll(async () => {
    await sequelize.close()
  })

  describe('countAndLastUpdated', () => {
    it('should return the count and last updated value for the given table', async () => {
      const tableName = 'Grants'
      const { updatedAt, count } = await countAndLastUpdated(tableName)
      expect(updatedAt).toBeInstanceOf(Date)
      expect(Number.isNaN(parseInt(count, DECIMAL_BASE))).toBe(false)
    })
    it('handles no results', async () => {
      // I hope this never bites us
      await SiteAlert.destroy({ where: {} })
      const tableName = 'SiteAlerts'
      const { updatedAt, count } = await countAndLastUpdated(tableName)
      expect(updatedAt).toEqual('')
      expect(Number.isNaN(parseInt(count, DECIMAL_BASE))).toBe(false)
    })
  })

  describe('run basic query', () => {
    it('should return the data in an object', async () => {
      const query = `
        SELECT
          "regionId",
          "status",
          count(*)
        FROM "Grants"
        GROUP BY "regionId", "status"
        ORDER BY "regionId", "status";`
      const [
        { regionId: firstRowRegion, status: firstRowStatus, count: firstRowCount },
        { regionId: secondRowRegion, status: secondRowStatus, count: secondRowCount },
      ] = await runSelectQuery(query)

      expect(firstRowRegion).toBe(1)
      expect(firstRowStatus).toBe('Active')
      expect(Number(firstRowCount)).toBeGreaterThan(0)
      expect(secondRowRegion).toBe(1)
      expect(secondRowStatus).toBe('Inactive')
      expect(Number(secondRowCount)).toBeGreaterThan(0)
    })
  })

  describe('run count and last updated', () => {
    it('should return the count and last updated value for the given table', async () => {
      const { updatedAt, count } = await countAndLastUpdated('Grants')
      expect(parseInt(count, DECIMAL_BASE)).toBeGreaterThan(0)
      expect(updatedAt).not.toBe('')
    })
  })

  it('should log specific messages to the auditLogger', async () => {
    await dataValidation()

    const complexPatterns = [/Grants data counts: \[\s*(.|\s)*\s*\]/m, /ActivityReports data counts: \[\s*(.|\s)*\s*\]/m]

    const simplePatterns = [
      /Goals has \d+ records, last updated at: .+/,
      /Recipients has \d+ records, last updated at: .+/,
      /Grants has \d+ records, last updated at: .+/,
      /ActivityReports has \d+ records, last updated at: .+/,
      /Users has \d+ records, last updated at: .+/,
      /Files has \d+ records, last updated at: */,
      /Objectives has \d+ records, last updated at: .*/,
      /NextSteps has \d+ records, last updated at: .*/,
    ]

    const allPatterns = [...simplePatterns, ...complexPatterns]

    const loggedMessages = auditLogger.info.mock.calls.map((call) => call[0])
    const unmatchedMessages = []

    loggedMessages.forEach((message, index) => {
      const matchedPattern = allPatterns.find((pattern) => pattern.test(message))
      if (!matchedPattern) {
        unmatchedMessages.push({ index: index + 1, message })
      }
    })

    expect(unmatchedMessages).toStrictEqual([])

    // Check if all expected patterns were matched
    allPatterns.forEach((pattern) => {
      const matched = loggedMessages.some((message) => pattern.test(message))
      expect(matched).toBeTruthy()
    })
  })
})
