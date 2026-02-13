import { REPORT_STATUSES } from '@ttahub/common'
import Goal from './goals'
import SCOPES from '../middleware/scopeConstants'

describe('Goals policies', () => {
  describe('isAdmin', () => {
    it('returns true if the user is an admin', async () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPES.ADMIN,
          },
        ],
      }

      const policy = new Goal(user)
      expect(policy.isAdmin()).toBe(true)
    })
    it('returns false if the user is not an admin', async () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      }

      const policy = new Goal(user)
      expect(policy.isAdmin()).toBe(false)
    })
  })
  describe('canDelete && canEdit', () => {
    it('returns false if the goal is on an approved activity report', async () => {
      const goal = {
        objectives: [
          {
            activityReports: [{ id: 1, calculatedStatus: REPORT_STATUSES.APPROVED }],
          },
        ],
        grant: { regionId: 2 },
      }
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.APPROVE_REPORTS,
          },
        ],
      }

      const policy = new Goal(user, goal)
      expect(policy.canDelete()).toBe(false)
    })

    it("returns false if user's permissions don't match the region", async () => {
      const goal = {
        objectives: [],
        grant: { regionId: 2 },
      }
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }

      const policy = new Goal(user, goal)
      expect(policy.canDelete()).toBe(false)
    })

    it('returns true otherwise', async () => {
      const goal = {
        objectives: [],
        grant: { regionId: 2 },
      }
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      }

      const policy = new Goal(user, goal)
      expect(policy.canDelete()).toBe(true)
    })

    it('returns true if user is admin', async () => {
      const goal = {
        objectives: [],
        grant: { regionId: 2 },
      }
      const user = {
        permissions: [
          {
            regionId: 14,
            scopeId: SCOPES.ADMIN,
          },
        ],
      }

      const policy = new Goal(user, goal)
      expect(policy.canDelete()).toBe(true)
    })
  })

  describe('canCreate', () => {
    it("returns false if they can't", async () => {
      const goal = {}
      const regionId = 2
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }

      const policy = new Goal(user, goal, regionId)

      expect(policy.canCreate()).toBe(false)
    })

    it('returns true if they can read/write', async () => {
      const goal = {}
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      }

      const regionId = 2

      const policy = new Goal(user, goal, regionId)

      expect(policy.canCreate()).toBe(true)
    })

    it('returns true if they can approve', async () => {
      const goal = {}
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.APPROVE_REPORTS,
          },
        ],
      }
      const regionId = 2

      const policy = new Goal(user, goal, regionId)

      expect(policy.canCreate()).toBe(true)
    })
  })

  describe('canReadInRegion', () => {
    it('works', async () => {
      const goal = {}
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.READ_WRITE_REPORTS,
          },
        ],
      }
      const regionId = 2

      const policy = new Goal(user, goal, regionId)

      expect(policy.canReadInRegion(2)).toBe(true)
    })
  })

  describe('isOnActivityReports', () => {
    it('works', async () => {
      const goal = {
        objectives: [
          {
            activityReports: [{ id: 1, calculatedStatus: REPORT_STATUSES.NEEDS_ACTION }],
          },
        ],
        grant: { regionId: 2 },
      }
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.APPROVE_REPORTS,
          },
        ],
      }

      const policy = new Goal(user, goal)
      expect(policy.isOnActivityReports()).toBe(true)
    })
  })

  describe('isOnApprovedActivityReports', () => {
    it('works', async () => {
      const goal = {
        objectives: [
          {
            activityReports: [{ id: 1, calculatedStatus: REPORT_STATUSES.APPROVED }],
          },
        ],
        grant: { regionId: 2 },
      }
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.APPROVE_REPORTS,
          },
        ],
      }

      const policy = new Goal(user, goal)
      expect(policy.isOnApprovedActivityReports()).toBe(true)
    })
  })

  describe('canView', () => {
    it('returns false if no goal', () => {
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.APPROVE_REPORTS,
          },
        ],
      }

      const policy = new Goal(user)
      expect(policy.canView()).toBe(false)
    })

    it('returns false if goal has no grant', () => {
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.APPROVE_REPORTS,
          },
        ],
      }

      const policy = new Goal(user, {})
      expect(policy.canView()).toBe(false)
    })

    it('returns true if user has permissions in that region', () => {
      const user = {
        permissions: [
          {
            regionId: 2,
            scopeId: SCOPES.APPROVE_REPORTS,
          },
        ],
      }

      const goal = {
        grant: { regionId: 2 },
      }

      const policy = new Goal(user, goal)
      expect(policy.canView()).toBe(true)
    })
  })
})
