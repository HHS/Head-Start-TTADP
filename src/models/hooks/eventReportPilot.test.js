import { Op } from 'sequelize'
import { afterUpdate, afterCreate } from './eventReportPilot'
import { trCollaboratorAdded } from '../../lib/mailer'
import { auditLogger } from '../../logger'
import db from '..'
import { createUser } from '../../testUtils'

jest.mock('../../lib/mailer', () => ({
  trCollaboratorAdded: jest.fn(),
  trPocEventComplete: jest.fn(),
  trVisionComplete: jest.fn(),
}))

describe('eventReportPilot', () => {
  const mockOptions = {
    transaction: {},
  }

  afterEach(() => {
    jest.clearAllMocks()
  })
  describe('afterUpdate', () => {
    describe('notifyNewCollaborators', () => {
      it('notifies new collaborators', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          collaboratorIds: [1, 2],
          changed: jest.fn(() => ['collaboratorIds']),
          previous: jest.fn(() => [1]),
        }
        await afterUpdate(null, instance, mockOptions)
        expect(trCollaboratorAdded).toHaveBeenCalled()
      })
      it('does not notify owner if owner is collaborator', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          collaboratorIds: [1, 5],
          changed: jest.fn(() => ['collaboratorIds']),
          previous: jest.fn(() => [1]),
        }
        await afterUpdate(null, instance, mockOptions)
        expect(trCollaboratorAdded).not.toHaveBeenCalled()
      })
      it('does not call if collaboratorIds is not changed', async () => {
        const instance = {
          eventId: 1,
          ownerId: 5,
          collaboratorIds: [1, 5],
          changed: jest.fn(() => ['data']),
          previous: jest.fn(() => [1]),
        }
        await afterUpdate(null, instance, mockOptions)
        expect(trCollaboratorAdded).not.toHaveBeenCalled()
      })
      it('handles errors', async () => {
        const instance = {}
        await afterUpdate(null, instance, mockOptions)
        expect(trCollaboratorAdded).not.toHaveBeenCalled()
      })
    })
  })
})
