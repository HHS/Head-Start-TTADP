import SCOPES from '../middleware/scopeConstants'
import Recipient from './recipient'

describe('Recipient', () => {
  describe('canMergeGoals', () => {
    it('returns true if user is a TTAC in a given region', async () => {
      const user = {
        roles: [
          {
            name: 'TTAC',
          },
        ],
        permissions: [
          {
            scopeId: SCOPES.READ_REPORTS,
            regionId: 1,
          },
        ],
      }
      const recipient = {
        grants: [
          {
            regionId: 1,
          },
        ],
      }
      const recipientPolicy = new Recipient(user, recipient)
      expect(recipientPolicy.canMergeGoals()).toBe(true)
    })
    it('returns true if the user is on an approved activity report', async () => {
      const user = {
        roles: [
          {
            name: 'Mole person',
          },
        ],
        permissions: [
          {
            scopeId: SCOPES.READ_REPORTS,
            regionId: 1,
          },
        ],
      }
      const recipient = {
        grants: [
          {
            regionId: 1,
          },
        ],
      }
      const recipientPolicy = new Recipient(user, recipient, true)
      expect(recipientPolicy.canMergeGoals()).toBe(true)
    })

    it('returns false otherwise', async () => {
      const user = {
        roles: [
          {
            name: 'Mole person',
          },
        ],
        permissions: [
          {
            scopeId: SCOPES.READ_REPORTS,
            regionId: 1,
          },
        ],
      }
      const recipient = {
        grants: [
          {
            regionId: 1,
          },
        ],
      }
      const recipientPolicy = new Recipient(user, recipient, false)
      expect(recipientPolicy.canMergeGoals()).toBe(false)
    })

    const createRecipientWithUser = (user) => {
      const recipient = { grants: [] }
      return new Recipient(user, recipient)
    }

    it("doesn't throw when there are no roles", async () => {
      const testCases = [{ user: undefined }, { user: { roles: undefined } }, { user: { roles: null } }, { user: { roles: 'not-an-array' } }]

      testCases.forEach((testCase) => {
        const recipient = createRecipientWithUser(testCase.user)

        expect(() => {
          recipient.canMergeGoals()
        }).not.toThrow()
      })
    })
  })
  describe('canView', () => {
    it('returns false if there are no read permissions', async () => {
      const user = {
        permissions: [],
      }
      const recipient = {
        grants: [
          {
            regionId: 1,
          },
        ],
      }
      const recipientPolicy = new Recipient(user, recipient)
      expect(recipientPolicy.canView()).toBe(false)
    })

    it('returns true if there are read permissions', async () => {
      const user = {
        permissions: [
          {
            scopeId: SCOPES.READ_REPORTS,
            regionId: 1,
          },
        ],
      }
      const recipient = {
        grants: [
          {
            regionId: 1,
          },
        ],
      }
      const recipientPolicy = new Recipient(user, recipient)
      expect(recipientPolicy.canView()).toBe(true)
    })
  })

  describe('canReadInRegion', () => {
    it('returns false if there are no read permissions', async () => {
      const user = {
        permissions: [],
      }
      const recipient = {
        grants: [
          {
            regionId: 1,
          },
        ],
      }
      const recipientPolicy = new Recipient(user, recipient)
      expect(recipientPolicy.canReadInRegion(1)).toBe(false)
    })

    describe('returns true', () => {
      it('if the user has read reports permissions', async () => {
        const user = {
          permissions: [
            {
              scopeId: SCOPES.READ_REPORTS,
              regionId: 1,
            },
          ],
        }
        const recipient = {
          grants: [
            {
              regionId: 1,
            },
          ],
        }
        const recipientPolicy = new Recipient(user, recipient)
        expect(recipientPolicy.canReadInRegion(1)).toBe(true)
      })
      it('if the user has read write reports permissions', async () => {
        const user = {
          permissions: [
            {
              scopeId: SCOPES.READ_WRITE_REPORTS,
              regionId: 1,
            },
          ],
        }
        const recipient = {
          grants: [
            {
              regionId: 1,
            },
          ],
        }
        const recipientPolicy = new Recipient(user, recipient)
        expect(recipientPolicy.canReadInRegion(1)).toBe(true)
      })

      it('if the user has approve reports permissions', async () => {
        const user = {
          permissions: [
            {
              scopeId: SCOPES.APPROVE_REPORTS,
              regionId: 1,
            },
          ],
        }
        const recipient = {
          grants: [
            {
              regionId: 1,
            },
          ],
        }
        const recipientPolicy = new Recipient(user, recipient)
        expect(recipientPolicy.canReadInRegion(1)).toBe(true)
      })
    })
  })
})
