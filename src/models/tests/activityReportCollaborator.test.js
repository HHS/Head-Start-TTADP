import { ActivityReportCollaborator } from '..'
import { auditLogger } from '../../logger'

jest.mock('../../logger')

describe('ActivityReportCollaborator Model', () => {
  it('should handle undefined user gracefully', () => {
    const instance = new ActivityReportCollaborator()
    instance.user = undefined
    instance.userId = 1

    expect(() => instance.fullName).not.toThrow()
    expect(auditLogger.error).toHaveBeenCalled()
    expect(instance.fullName).toBe('')
  })

  it('should return correct fullName when user and roles are defined', () => {
    const instance = new ActivityReportCollaborator()
    instance.user = { name: 'Joe Brown', roles: [{ name: 'Admin' }] }
    instance.roles = [{ name: 'GS' }]

    expect(instance.fullName).toEqual('Joe Brown, GS')
  })
})
