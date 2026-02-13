/* eslint-disable max-len */
import faker from '@faker-js/faker'
import { TRAINING_REPORT_STATUSES, REPORT_STATUSES } from '@ttahub/common'
import { EventReportPilot, SessionReportPilot, User } from '../models'
import { getTrainingReportAlerts, getTrainingReportAlertsForUser } from './event'

jest.mock('bull')

const regionId = 1

const CURRENT_DATE = new Date()

async function createEvents({ ownerId = faker.datatype.number(), collaboratorId = faker.datatype.number(), pocId = faker.datatype.number() }) {
  // create some events!!!
  const baseEvent = {
    ownerId,
    collaboratorIds: [collaboratorId],
    pocIds: [pocId],
    regionId: 1,
    data: {
      eventName: faker.datatype.string(),
      eventId: `R0${regionId}-TR-${faker.datatype.number(4)}`,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      trainingType: 'Series',
      targetPopulations: ['Children & Families'],
      reasons: ['Coaching'],
      vision: 'Testing!',
      eventSubmitted: false,
    },
  }

  const testData = {
    ids: [],
    ist: {
      missingEventInfo: [],
      missingSessionInfo: [],
      noSessionsCreated: [],
      eventNotCompleted: [],
    },
    poc: {
      missingSessionInfo: [],
    },
  }

  // event that has no start date (will not appear in alerts)
  const minus2 = await EventReportPilot.create(baseEvent)
  testData.ids.push(minus2.id)

  // event with no sessions and a start date of today (Will not appear in alerts)
  const minus1 = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: CURRENT_DATE,
    },
  })

  testData.ids.push(minus1.id)

  // event with no sessions and a start date of one month ago (Will appear in alerts)
  // also missing event data
  const a = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
      endDate: null,
    },
  })

  testData.ist.missingEventInfo.push(a.id)
  testData.ist.noSessionsCreated.push(a.id)

  // basic event: no sessions, but complete data
  const b = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      eventSubmitted: true,
      startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
      endDate: CURRENT_DATE,
    },
  })

  testData.ist.noSessionsCreated.push(b.id)

  // complete event with incomplete sessions, but no date on the sessions
  // will not appear in alerts
  const c = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      eventSubmitted: true,
      startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
      endDate: CURRENT_DATE,
    },
  })

  const c1 = await SessionReportPilot.create({
    eventId: c.id,
    data: {
      sessionName: faker.datatype.string(),
    },
  })

  testData.ids.push(c.id)
  testData.ids.push(c1.id)

  // complete event, 20 days past end date
  const e = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 2)),
      endDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
      eventSubmitted: true,
      status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
    },
  })

  const e1 = await SessionReportPilot.create({
    eventId: e.id,
    data: {},
  })

  testData.ist.eventNotCompleted.push(e.id)
  testData.ids.push(e1.id)

  const f = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
      endDate: CURRENT_DATE,
      eventSubmitted: true,
    },
  })

  testData.ids.push(f.id)

  // poc incomplete session
  const f1 = await SessionReportPilot.create({
    eventId: f.id,
    data: {
      sessionName: faker.datatype.string(),
      startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
      endDate: CURRENT_DATE,
      duration: 'Series',
      objective: 'This is an objective',
      objectiveTopics: ['Coaching'],
      objectiveTrainers: ['HBHS'],
      ttaProvided: 'Test TTA',
      supportType: 'Maintaining',
      useIpdCourses: true,
      courses: [],
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'yes',
      regionalOfficeTta: 'TTAC',
      nextSteps: [{ completeDate: CURRENT_DATE, note: 'Next step 1' }],
      pocComplete: false,
      collabComplete: true,
    },
  })

  testData.ist.missingSessionInfo.push(f1.id)

  const g = await EventReportPilot.create({
    ...baseEvent,
    data: {
      ...baseEvent.data,
      startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
      endDate: CURRENT_DATE,
      eventSubmitted: true,
    },
  })

  testData.ids.push(g.id)

  // owner incomplete session
  const g1 = await SessionReportPilot.create({
    eventId: g.id,
    data: {
      sessionName: faker.datatype.string(),
      startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
      endDate: CURRENT_DATE,
      duration: 'Series',
      objective: 'This is an objective',
      objectiveTopics: ['Coaching'],
      objectiveTrainers: ['HBHS'],
      ttaProvided: 'Test TTA',
      supportType: 'Maintaining',
      useIpdCourses: true,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'yes',
      regionalOfficeTta: 'TTAC',
      nextSteps: [{ completeDate: CURRENT_DATE, note: 'Next step 1' }],
      pocComplete: true,
      collabComplete: false,
    },
  })

  testData.ist.missingSessionInfo.push(g1.id)

  // should not appear in alerts, as it is compete
  const finalSesh = await SessionReportPilot.create({
    eventId: g.id,
    data: {
      status: TRAINING_REPORT_STATUSES.COMPLETE,
      sessionName: faker.datatype.string(),
      startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
      endDate: CURRENT_DATE,
      duration: 'Series',
      objective: 'This is an objective',
      objectiveTopics: ['Coaching'],
      objectiveTrainers: ['HBHS'],
      ttaProvided: 'Test TTA',
      supportType: 'Maintaining',
      useIpdCourses: false,
      deliveryMethod: 'In Person',
      language: 'English',
      isIstVisit: 'yes',
      nextSteps: [{ completeDate: CURRENT_DATE, note: 'Next step 1' }],
      pocComplete: true,
      collabComplete: false,
    },
  })

  testData.ids.push(finalSesh.id)

  testData.ids = new Set([
    ...testData.ids,
    ...testData.ist.missingEventInfo,
    ...testData.ist.missingSessionInfo,
    ...testData.ist.noSessionsCreated,
    ...testData.ist.eventNotCompleted,
  ])

  return testData
}

describe('getTrainingReportAlerts', () => {
  const ownerId = faker.datatype.number()

  describe('getAllAlerts', () => {
    let testData
    beforeAll(async () => {
      testData = await createEvents({ ownerId })
    })

    it('fetches the correct alerts', async () => {
      const alerts = await getTrainingReportAlerts()
      // Filter to just time-based alerts from our test data
      const timeBasedAlerts = alerts.filter((a) => !['waitingForApproval', 'changesNeeded'].includes(a.alertType))
      const idsToCheck = timeBasedAlerts.map((i) => i.id).filter((i) => testData.ids.has(i))
      const expectedIds = [
        ...new Set([
          ...testData.ist.missingEventInfo,
          ...testData.ist.missingSessionInfo,
          ...testData.ist.noSessionsCreated,
          ...testData.ist.eventNotCompleted,
        ]),
      ]

      // Verify all expected IDs are present in time-based alerts
      expectedIds.forEach((expectedId) => {
        expect(idsToCheck).toContain(expectedId, `Expected ${expectedId} to be in alerts for time-based alert types`)
      })
    })

    it('triggers missingEventInfo alert 20 days after END date', async () => {
      // Create event with endDate 20 days ago
      const eventWithOldEndDate = await EventReportPilot.create({
        ownerId,
        collaboratorIds: [faker.datatype.number()],
        pocIds: [faker.datatype.number()],
        regionId: 1,
        data: {
          eventName: 'Missing Event Info Test',
          eventId: `R01-TR-ENDDATE-${ownerId}`,
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
          trainingType: 'Series',
          targetPopulations: ['Children & Families'],
          reasons: ['Coaching'],
          vision: 'Testing end date!',
          eventSubmitted: false,
          startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 2)),
          endDate: new Date(CURRENT_DATE.setDate(CURRENT_DATE.getDate() - 20)), // 20 days ago
        },
      })

      const alerts = await getTrainingReportAlerts(ownerId, [1])
      const missingEventAlert = alerts.find((a) => a.alertType === 'missingEventInfo' && a.id === eventWithOldEndDate.id)

      expect(missingEventAlert).toBeTruthy()
      expect(missingEventAlert.eventName).toBe('Missing Event Info Test')

      // Clean up immediately so it doesn't get captured by outer rollback
      await EventReportPilot.destroy({ where: { id: eventWithOldEndDate.id }, force: true })
    })

    afterAll(async () => {
      // Destroy all created test events so outer rollback doesn't try to revert them
      const createdIds = Array.from(testData.ids)
      await SessionReportPilot.destroy({ where: { eventId: createdIds }, force: true })
      await EventReportPilot.destroy({ where: { id: createdIds }, force: true })
    })
  })

  describe('approval workflow alerts', () => {
    let submitter
    let approver
    let event
    let sessionWaitingForApproval
    let sessionChangesNeeded

    beforeAll(async () => {
      const uniqueId = Date.now()
      submitter = await User.create({
        name: 'Test Submitter',
        email: `submitter-${uniqueId}@test.gov`,
        hsesUserId: `submitter-test-${uniqueId}`,
        hsesUsername: `submitter-test-${uniqueId}`,
      })

      approver = await User.create({
        name: 'Test Approver',
        email: `approver-${uniqueId}@test.gov`,
        hsesUserId: `approver-test-${uniqueId}`,
        hsesUsername: `approver-test-${uniqueId}`,
      })

      event = await EventReportPilot.create({
        ownerId: submitter.id,
        collaboratorIds: [approver.id], // Add approver as collaborator so they see the event
        pocIds: [],
        regionId: 1,
        data: {
          eventId: 'R01-PD-TESTAPPROVAL',
          eventName: 'Test Approval Event',
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
          trainingType: 'Series',
          targetPopulations: ['Children & Families'],
          reasons: ['Coaching'],
          vision: 'Testing approval workflow!',
          eventSubmitted: true,
          startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
          endDate: CURRENT_DATE,
        },
      })

      // Session waiting for approval - submitted but not yet approved
      sessionWaitingForApproval = await SessionReportPilot.create({
        eventId: event.id,
        approverId: approver.id,
        submitterId: submitter.id,
        data: {
          sessionName: 'Session Waiting for Approval',
          status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
          startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
          endDate: CURRENT_DATE,
          duration: 'Series',
          objective: 'This is an objective',
          objectiveTopics: ['Coaching'],
          objectiveTrainers: ['HBHS'],
          ttaProvided: 'Test TTA',
          supportType: 'Maintaining',
          useIpdCourses: true,
          deliveryMethod: 'In Person',
          language: 'English',
          isIstVisit: 'yes',
          nextSteps: [{ completeDate: CURRENT_DATE, note: 'Next step 1' }],
          pocComplete: true,
          collabComplete: true,
        },
      })

      // Session with changes needed - sent back by approver
      sessionChangesNeeded = await SessionReportPilot.create({
        eventId: event.id,
        approverId: approver.id,
        submitterId: submitter.id,
        data: {
          sessionName: 'Session Needing Changes',
          status: REPORT_STATUSES.NEEDS_ACTION,
          startDate: new Date(CURRENT_DATE.setMonth(CURRENT_DATE.getMonth() - 1)),
          endDate: CURRENT_DATE,
          duration: 'Series',
          objective: 'This is an objective',
          objectiveTopics: ['Coaching'],
          objectiveTrainers: ['HBHS'],
          ttaProvided: 'Test TTA',
          supportType: 'Maintaining',
          useIpdCourses: true,
          deliveryMethod: 'In Person',
          language: 'English',
          isIstVisit: 'yes',
          nextSteps: [{ completeDate: CURRENT_DATE, note: 'Next step 1' }],
          pocComplete: true,
          collabComplete: true,
        },
      })
    })

    afterAll(async () => {
      await SessionReportPilot.destroy({
        where: { eventId: event.id },
      })
      await EventReportPilot.destroy({
        where: { id: event.id },
      })
      await User.destroy({
        where: { id: [submitter.id, approver.id] },
      })
    })

    it('should show waitingForApproval alert to submitter', async () => {
      const alerts = await getTrainingReportAlertsForUser(submitter.id, [1])

      const waitingAlert = alerts.find((a) => a.alertType === 'waitingForApproval' && a.id === sessionWaitingForApproval.id)
      expect(waitingAlert).toBeTruthy()
      expect(waitingAlert.sessionName).toBe('Session Waiting for Approval')
      expect(waitingAlert.submitterId).toBe(submitter.id)
      expect(waitingAlert.approverId).toBe(approver.id)
      expect(waitingAlert.approverName).toBe('Test Approver')
    })

    it('should show waitingForApproval alert to approver', async () => {
      const alerts = await getTrainingReportAlertsForUser(approver.id, [1])

      const waitingAlert = alerts.find((a) => a.alertType === 'waitingForApproval' && a.id === sessionWaitingForApproval.id)
      expect(waitingAlert).toBeTruthy()
      expect(waitingAlert.sessionName).toBe('Session Waiting for Approval')
    })

    it('should show changesNeeded alert to submitter only', async () => {
      const submitterAlerts = await getTrainingReportAlertsForUser(submitter.id, [1])
      const approverAlerts = await getTrainingReportAlertsForUser(approver.id, [1])

      const submitterChangesAlert = submitterAlerts.find((a) => a.alertType === 'changesNeeded' && a.id === sessionChangesNeeded.id)
      const approverChangesAlert = approverAlerts.find((a) => a.alertType === 'changesNeeded' && a.id === sessionChangesNeeded.id)

      expect(submitterChangesAlert).toBeTruthy()
      expect(submitterChangesAlert.sessionName).toBe('Session Needing Changes')
      expect(approverChangesAlert).toBeUndefined()
    })

    it('should not show approval alerts to unrelated users', async () => {
      const uniqueId = Date.now()
      const otherUser = await User.create({
        name: 'Other User',
        email: `other-${uniqueId}@test.gov`,
        hsesUserId: `other-test-${uniqueId}`,
        hsesUsername: `other-test-${uniqueId}`,
      })

      const alerts = await getTrainingReportAlertsForUser(otherUser.id, [1])

      const waitingAlert = alerts.find((a) => a.alertType === 'waitingForApproval' && a.id === sessionWaitingForApproval.id)
      const changesAlert = alerts.find((a) => a.alertType === 'changesNeeded' && a.id === sessionChangesNeeded.id)

      expect(waitingAlert).toBeUndefined()
      expect(changesAlert).toBeUndefined()

      await User.destroy({ where: { id: otherUser.id } })
    })

    it('should include enriched user data in alerts', async () => {
      const alerts = await getTrainingReportAlertsForUser(submitter.id, [1])

      const waitingAlert = alerts.find((a) => a.alertType === 'waitingForApproval' && a.id === sessionWaitingForApproval.id)

      expect(waitingAlert.approverName).toBe('Test Approver')
      expect(Array.isArray(waitingAlert.collaboratorNames)).toBe(true)
    })
  })
})
