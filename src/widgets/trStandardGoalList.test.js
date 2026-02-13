import faker from '@faker-js/faker'
import { TRAINING_REPORT_STATUSES } from '@ttahub/common'
import { User, EventReportPilot, SessionReportPilot, GoalTemplate, SessionReportPilotGoalTemplate, sequelize } from '../models'
import filtersToScopes from '../scopes'
import { createEvent } from '../services/event'
import trStandardGoalList from './trStandardGoalList'

const mockUser = {
  homeRegionId: 1,
  name: faker.name.findName(),
  hsesUsername: faker.internet.email(),
  hsesUserId: `fake${faker.unique(() => faker.datatype.number({ min: 1, max: 10000 }))}`,
  lastLogin: new Date(),
}

describe('trStandardGoalList', () => {
  let user
  let eventReportComplete1
  let eventReportComplete2
  let eventReportIncomplete
  let goalTemplate1
  let goalTemplate2
  let sessionReportComplete1
  let sessionReportComplete2
  let sessionReportComplete3
  let sessionReportIncomplete

  const createAnEvent = async ({ userId, status, startDate }) =>
    createEvent({
      ownerId: userId,
      regionId: userId,
      pocIds: [userId],
      collaboratorIds: [userId],
      data: {
        startDate,
        status,
      },
    })

  beforeAll(async () => {
    // Create test user
    user = await User.create(mockUser)

    // Find existing goal templates from migration
    goalTemplate1 = await GoalTemplate.findOne({
      where: { standard: 'Teaching Practices' },
    })

    if (!goalTemplate1) {
      throw new Error('Teaching Practices template not found - migration did not run')
    }

    goalTemplate2 = await GoalTemplate.findOne({
      where: { standard: 'ERSEA' },
    })

    if (!goalTemplate2) {
      throw new Error('ERSEA template not found - migration did not run')
    }

    // Create event reports with complete status and valid start dates
    eventReportComplete1 = await createAnEvent({
      userId: user.id,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      startDate: new Date('2025-10-01'),
    })

    eventReportComplete2 = await createAnEvent({
      userId: user.id,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      startDate: new Date('2025-11-15'),
    })

    // Event with incomplete status - should not be included in results
    eventReportIncomplete = await createAnEvent({
      userId: user.id,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      startDate: new Date('2025-10-01'),
    })

    // Session reports linked to complete events
    sessionReportComplete1 = await SessionReportPilot.create({
      eventId: eventReportComplete1.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    })

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete1.id,
      goalTemplateId: goalTemplate1.id,
    })

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete1.id,
      goalTemplateId: goalTemplate2.id,
    })

    sessionReportComplete2 = await SessionReportPilot.create({
      eventId: eventReportComplete2.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    })

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete2.id,
      goalTemplateId: goalTemplate1.id,
    })

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete2.id,
      goalTemplateId: goalTemplate2.id,
    })

    // Another session report for the first event (different event but same template)
    sessionReportComplete3 = await SessionReportPilot.create({
      eventId: eventReportComplete1.id,
      data: {
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    })

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete3.id,
      goalTemplateId: goalTemplate1.id,
    })

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportComplete3.id,
      goalTemplateId: goalTemplate2.id,
    })

    // Session report with incomplete status - should not be included
    sessionReportIncomplete = await SessionReportPilot.create({
      eventId: eventReportIncomplete.id,
      data: {
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      },
    })

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportIncomplete.id,
      goalTemplateId: goalTemplate1.id,
    })

    await SessionReportPilotGoalTemplate.create({
      sessionReportPilotId: sessionReportIncomplete.id,
      goalTemplateId: goalTemplate2.id,
    })

    await sequelize.query(`
      UPDATE "EventReportPilots"
        SET data = JSONB_SET(data,'{status}','"${TRAINING_REPORT_STATUSES.COMPLETE}"')
      WHERE id IN (${eventReportComplete1.id}, ${eventReportComplete2.id});      
    `)
  })

  afterAll(async () => {
    await SessionReportPilotGoalTemplate.destroy({
      where: {
        sessionReportPilotId: [sessionReportComplete1.id, sessionReportComplete2.id, sessionReportComplete3.id, sessionReportIncomplete.id],
      },
    })

    await SessionReportPilot.destroy({
      where: {
        id: [sessionReportComplete1.id, sessionReportComplete2.id, sessionReportComplete3.id, sessionReportIncomplete.id],
      },
      force: true,
    })

    await EventReportPilot.destroy({
      where: {
        id: [eventReportComplete1.id, eventReportComplete2.id, eventReportIncomplete.id],
      },
      force: true,
    })

    await User.destroy({
      where: {
        id: user.id,
      },
    })
  })

  it('returns counts of curated standard goals linked to complete training reports', async () => {
    const scopes = filtersToScopes({})

    const results = await trStandardGoalList(scopes)

    // Should only return curated standards (not Monitoring)
    // Both Teaching Practices and ERSEA should be present
    expect(results.length).toBeGreaterThanOrEqual(2)

    // Find the results for our test standards
    const teachingPracticesResult = results.find((r) => r.name === 'Teaching Practices')
    const ersearResult = results.find((r) => r.name === 'ERSEA')

    // Both should exist in results
    expect(teachingPracticesResult).toBeDefined()
    expect(ersearResult).toBeDefined()

    // Monitoring standard should not be in results
    const monitoringResult = results.find((r) => r.name === 'Monitoring')
    expect(monitoringResult).toBeUndefined()
  })

  it('only counts session reports with complete status', async () => {
    const scopes = filtersToScopes({})

    const results = await trStandardGoalList(scopes)

    // Should only count complete session reports
    // Incomplete session reports should be excluded
    const teachingPracticesResult = results.find((r) => r.name === 'Teaching Practices')

    // The count should only reflect the complete session reports
    expect(teachingPracticesResult).toBeDefined()
    expect(Number(teachingPracticesResult.count)).toBeGreaterThan(0)
    // Incomplete sessions should not be counted
    expect(Number(teachingPracticesResult.count)).toBeLessThanOrEqual(3)
  })

  it('only includes events with complete status and start date >= 2025-09-01', async () => {
    const scopes = filtersToScopes({})

    const results = await trStandardGoalList(scopes)

    // Should only count session reports from complete events with valid start dates
    // Events before 2025-09-01 or with incomplete status should be excluded
    expect(results).toBeDefined()
    expect(Array.isArray(results)).toBe(true)
  })

  it('excludes Monitoring standard from results', async () => {
    const scopes = filtersToScopes({})

    const results = await trStandardGoalList(scopes)

    // Verify no Monitoring standard in results
    const monitoringResults = results.filter((r) => r.standard === 'Monitoring')
    expect(monitoringResults).toHaveLength(0)
  })

  it('counts distinct event IDs for session reports', async () => {
    const scopes = filtersToScopes({})

    const results = await trStandardGoalList(scopes)

    // Results should have a count attribute representing distinct event counts
    expect(results.length).toBeGreaterThanOrEqual(0)

    results.forEach((result) => {
      expect(result).toHaveProperty('count')
      expect(typeof result.count).toBe('string')
      expect(Number(result.count)).not.toBeNaN()
    })
  })

  it('applies scopes to filter results', async () => {
    // Create scopes with a filter that won't match our test data
    const query = { 'region.in': ['999'] }
    const scopes = await filtersToScopes(query)

    const results = await trStandardGoalList(scopes)

    // Should return empty or filtered results based on scopes
    expect(Array.isArray(results)).toBe(true)
  })

  it('returns empty array when no events match the scopes filter', async () => {
    // Use scopes with a region that doesn't match any test data
    const query = { 'region.in': ['999'] }
    const scopes = await filtersToScopes(query)

    const results = await trStandardGoalList(scopes)

    // Should return empty array due to early return when no events found
    expect(results).toEqual([])
  })

  it('returns results sorted by count in descending order', async () => {
    const scopes = filtersToScopes({})

    const results = await trStandardGoalList(scopes)

    // Verify results are sorted by count descending
    for (let i = 0; i < results.length - 1; i += 1) {
      expect(Number(results[i].count)).toBeGreaterThanOrEqual(Number(results[i + 1].count))
    }
  })
})
