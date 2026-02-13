import { TRAINING_REPORT_STATUSES, REASONS, DEPRECATED_REASONS } from '@ttahub/common'
import db, { EventReportPilot, SessionReportPilot, Recipient, Grant, User } from '../models'
import { createUser, createGrant, createRecipient, createSessionReport, createTrainingReport } from '../testUtils'
import trReasonList from './trReasonList'

// We need to mock this so that we don't try to send emails or otherwise engage the queue
jest.mock('bull')

describe('TR reason list', () => {
  let userCreator
  let userPoc
  let userCollaborator

  let recipient1
  let recipient2
  let recipient3
  let recipient4
  let recipient5

  let grant1
  let grant2
  let grant3
  let grant4
  let grant5

  let trainingReport1
  let trainingReport2
  let trainingReport3

  beforeAll(async () => {
    // user/creator
    userCreator = await createUser()
    // user/poc
    userPoc = await createUser()
    // user/collaborator ID
    userCollaborator = await createUser()

    // recipient 1
    recipient1 = await createRecipient()
    // recipient 2
    recipient2 = await createRecipient()
    // recipient 3
    recipient3 = await createRecipient()
    // recipient 4
    recipient4 = await createRecipient()
    // recipient 5 (only on uncompleted report)
    recipient5 = await createRecipient()

    // grant 1
    grant1 = await createGrant({ recipientId: recipient1.id, regionId: userCreator.homeRegionId })
    // grant 2
    grant2 = await createGrant({ recipientId: recipient2.id, regionId: userCreator.homeRegionId })
    // grant 3
    grant3 = await createGrant({ recipientId: recipient3.id, regionId: userCreator.homeRegionId })
    // grant 4
    grant4 = await createGrant({ recipientId: recipient4.id, regionId: userCreator.homeRegionId })
    // grant 5 (only on uncompleted report)
    grant5 = await createGrant({ recipientId: recipient5.id, regionId: userCreator.homeRegionId })

    // training report 1
    trainingReport1 = await createTrainingReport({
      collaboratorIds: [userCollaborator.id],
      pocIds: [userPoc.id],
      ownerId: userCreator.id,
      data: {
        reasons: ['Monitoring | Area of Concern', 'Monitoring | Noncompliance', 'Monitoring | Deficiency'],
      },
    })

    // - session report 1
    await createSessionReport({
      eventId: trainingReport1.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }, { value: grant2.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 25,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    })

    // - session report 2
    await createSessionReport({
      eventId: trainingReport1.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }, { value: grant2.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 25,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    })

    // training report 2
    trainingReport2 = await createTrainingReport({
      collaboratorIds: [userCollaborator.id],
      pocIds: [userPoc.id],
      ownerId: userCreator.id,
      data: {
        reasons: ['Monitoring | Area of Concern', 'Monitoring | Deficiency'],
      },
    })

    // - session report 3
    await createSessionReport({
      eventId: trainingReport2.id,
      data: {
        deliveryMethod: 'hybrid',
        duration: 1,
        recipients: [{ value: grant1.id }, { value: grant2.id }],
        numberOfParticipantsVirtually: 12,
        numberOfParticipantsInPerson: 13,
        numberOfParticipants: 0,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    })

    // - session report 4
    await createSessionReport({
      eventId: trainingReport2.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant2.id }, { value: grant3.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 25,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    })

    // training report 3 (sessions not completed)
    trainingReport3 = await createTrainingReport(
      {
        collaboratorIds: [userCollaborator.id],
        pocIds: [userPoc.id],
        ownerId: userCreator.id,
      },
      { individualHooks: false }
    )

    // - session report 5
    await createSessionReport({
      eventId: trainingReport3.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }, { value: grant2.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 25,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      },
    })

    // - session report 6
    await createSessionReport({
      eventId: trainingReport3.id,
      data: {
        deliveryMethod: 'in-person',
        duration: 1,
        recipients: [{ value: grant1.id }, { value: grant2.id }],
        numberOfParticipantsVirtually: 0,
        numberOfParticipantsInPerson: 0,
        numberOfParticipants: 25,
        status: TRAINING_REPORT_STATUSES.IN_PROGRESS,
      },
    })

    // update TR 1 to complete, the others will be "in progress" as they have sessions
    await trainingReport1.update({
      data: {
        ...trainingReport1.data,
        status: TRAINING_REPORT_STATUSES.COMPLETE,
      },
    })
  })

  afterAll(async () => {
    // delete session reports
    await SessionReportPilot.destroy({
      where: {
        eventId: [trainingReport1.id, trainingReport2.id, trainingReport3.id],
      },
    })

    // delete training reports
    await EventReportPilot.destroy({
      where: {
        id: [trainingReport1.id, trainingReport2.id, trainingReport3.id],
      },
    })

    await db.GrantNumberLink.destroy({
      where: {
        grantId: [grant1.id, grant2.id, grant3.id, grant4.id, grant5.id],
      },
      force: true,
    })

    // delete grants
    await Grant.destroy({
      where: {
        id: [grant1.id, grant2.id, grant3.id, grant4.id, grant5.id],
      },
      individualHooks: true,
    })

    // delete recipients
    await Recipient.destroy({
      where: {
        id: [recipient1.id, recipient2.id, recipient3.id, recipient4.id, recipient5.id],
      },
    })

    // delete users
    await User.destroy({
      where: {
        id: [userCreator.id, userPoc.id, userCollaborator.id],
      },
    })

    await db.sequelize.close()
  })

  it('filters and calculates training report reasons', async () => {
    // Confine this to the grants and reports that we created
    const scopes = {
      grant: [{ id: [grant1.id, grant2.id, grant3.id, grant4.id, grant5.id] }],
      trainingReport: [{ id: [trainingReport1.id, trainingReport2.id, trainingReport3.id] }],
    }

    // run our function
    const data = await trReasonList(scopes)
    const rs = [...DEPRECATED_REASONS, ...REASONS]

    expect(data.length).toBe(rs.length)

    const areaOfConcern = data.find((reason) => reason.name === 'Monitoring | Area of Concern')
    expect(areaOfConcern.count).toBe(2)

    const noncompliance = data.find((reason) => reason.name === 'Monitoring | Noncompliance')
    expect(noncompliance.count).toBe(1)

    const deficiency = data.find((reason) => reason.name === 'Monitoring | Deficiency')
    expect(deficiency.count).toBe(2)

    const filteredOut = data.filter((reason) => reason.count === 0)

    expect(filteredOut.length).toBe(rs.length - 3)
  })
})
