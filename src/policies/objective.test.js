import Objective from './objective'
import SCOPES from '../middleware/scopeConstants'
import { GOAL_STATUS, OBJECTIVE_STATUS } from '../constants'

describe('Objective', () => {
  let objective
  let user

  beforeEach(() => {
    user = {
      permissions: [
        {
          scopeId: SCOPES.READ_WRITE_REPORTS,
          regionId: 1,
        },
      ],
    }
    objective = new Objective(
      {
        status: OBJECTIVE_STATUS.ACTIVE,
        goal: {
          status: GOAL_STATUS.OPEN,
          grant: {
            regionId: 1,
          },
        },
      },
      user
    )
  })

  describe('canWriteInRegion', () => {
    it('should return true if user has permission for the region', () => {
      expect(objective.canWriteInRegion(1)).toBe(true)
    })

    it('should return false if user does not have permission for the region', () => {
      expect(objective.canWriteInRegion(2)).toBe(false)
    })
  })

  describe('canUpload', () => {
    it('should return true if objective is not complete and user can write in goal region', () => {
      expect(objective.canUpload()).toBe(true)
    })

    it('should return false if objective is complete', () => {
      objective.objective.status = OBJECTIVE_STATUS.COMPLETE
      expect(objective.canUpload()).toBe(false)
    })

    it('should return false if objective has no goal', () => {
      objective.objective.goal = null
      expect(objective.canUpload()).toBe(false)
    })

    it('should return false if goal is closed', () => {
      objective.objective.goal.status = GOAL_STATUS.CLOSED
      expect(objective.canUpload()).toBe(false)
    })

    it('should return false if goal does not have grant region', () => {
      objective.objective.goal.grant = null
      expect(objective.canUpload()).toBe(false)
    })

    it('should return false if user cannot write in goal region', () => {
      objective.user.permissions = []
      expect(objective.canUpload()).toBe(false)
    })
  })

  describe('canUpdate', () => {
    it('should return true if objective is not onApprovedAR and user can write in goal region', () => {
      expect(objective.canUpdate()).toBe(true)
    })

    it('should return false if objective is onApprovedAR', () => {
      objective.objective.onApprovedAR = true
      expect(objective.canUpdate()).toBe(false)
    })

    it('should return false if objective has no goal', () => {
      objective.objective.goal = null
      expect(objective.canUpdate()).toBe(false)
    })

    it('should return false if goal does not have grant region', () => {
      objective.objective.goal.grant = null
      expect(objective.canUpdate()).toBe(false)
    })

    it('should return false if user cannot write in goal region', () => {
      objective.user.permissions = []
      expect(objective.canUpdate()).toBe(false)
    })
  })
})
