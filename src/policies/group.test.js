import SCOPES from '../middleware/scopeConstants'
import Group from './group'

describe('Group', () => {
  describe('canAddToGroup', () => {
    it('should return true if the user has the proper permissions', () => {
      const user = {
        id: 1,
        permissions: [
          {
            region: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }

      const grants = [
        {
          region: 1,
        },
      ]

      const g = new Group(user, grants)

      expect(g.canAddToGroup()).toBe(true)
    })

    it('should return false if the user does not have the proper permissions', () => {
      const user = {
        id: 1,
        permissions: [
          {
            regionId: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }

      const grants = [
        {
          regionId: 2,
        },
      ]

      const g = new Group(user, grants)

      expect(g.canAddToGroup()).toBe(false)
    })
  })

  describe('ownsGroup', () => {
    it('should return true if the user owns the group', () => {
      const user = { id: 1 }
      const group = {
        groupCollaborators: [{ user: { id: 1 }, collaboratorType: { name: 'Creator' } }],
      }

      const g = new Group(user, [], group)

      expect(g.ownsGroup()).toBe(true)
    })

    it('should return true if the user is a CoOwner the group', () => {
      const user = { id: 1 }
      const group = {
        groupCollaborators: [{ user: { id: 1 }, collaboratorType: { name: 'Co-Owner' } }],
      }

      const g = new Group(user, [], group)

      expect(g.ownsGroup()).toBe(true)
    })

    it('should return false if the user does not own the group', () => {
      const user = { id: 1 }
      const group = { userId: 2 }

      const g = new Group(user, [], group)

      expect(g.ownsGroup()).toBe(false)
    })
  })

  describe('isPublic', () => {
    it('should return true if the group is public and the user has acccess to that groups region', () => {
      const user = {
        id: 1,
        permissions: [
          {
            region: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }

      const grants = [
        {
          region: 1,
        },
      ]

      const group = { isPublic: true }

      const g = new Group(user, grants, group)

      expect(g.isPublic()).toBe(true)
    })

    it('should return false if the group is public and the user does not have acccess to that groups region', () => {
      const user = {
        id: 1,
        permissions: [
          {
            regionId: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }

      const grants = [
        {
          regionId: 2,
        },
      ]

      const group = { isPublic: true }

      const g = new Group(user, grants, group)

      expect(g.isPublic()).toBe(false)
    })

    it('should return false if the group is not public', () => {
      const user = {
        id: 1,
        permissions: [
          {
            region: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }

      const grants = [
        {
          region: 1,
        },
      ]

      const group = { isPublic: false }

      const g = new Group(user, grants, group)

      expect(g.isPublic()).toBe(false)
    })
  })

  describe('constructor', () => {
    it('should use group grants if grants are not provided', () => {
      const user = { id: 1, permissions: [] }
      const group = { grants: [{ regionId: 1 }] }

      const g = new Group(user, undefined, group)

      expect(g.grants).toEqual(group.grants)
    })

    it('should use an empty array if neither grants nor group grants are provided', () => {
      const user = { id: 1, permissions: [] }
      const group = {}

      const g = new Group(user, undefined, group)

      expect(g.grants).toEqual([])
    })
  })

  describe('canEditGroup', () => {
    it('should return true if the user is a Creator of the group', () => {
      const user = { id: 1 }
      const group = {
        groupCollaborators: [{ user: { id: 1 }, collaboratorType: { name: 'Creator' } }],
      }

      const g = new Group(user, [], group)

      expect(g.canEditGroup()).toBe(true)
    })

    it('should return true if the user is a Co-Owner of the group', () => {
      const user = { id: 1 }
      const group = {
        groupCollaborators: [{ user: { id: 1 }, collaboratorType: { name: 'Co-Owner' } }],
      }

      const g = new Group(user, [], group)

      expect(g.canEditGroup()).toBe(true)
    })

    it('should return false if the user is not a Creator or Co-Owner of the group', () => {
      const user = { id: 1 }
      const group = {
        groupCollaborators: [{ user: { id: 2 }, collaboratorType: { name: 'Member' } }],
      }

      const g = new Group(user, [], group)

      expect(g.canEditGroup()).toBe(false)
    })
  })

  describe('canUseGroup', () => {
    it('should return true if the user is a collaborator of the group', () => {
      const user = { id: 1 }
      const group = {
        groupCollaborators: [{ user: { id: 1 }, collaboratorType: { name: 'Member' } }],
      }

      const g = new Group(user, [], group)

      expect(g.canUseGroup()).toBe(true)
    })

    it("should return true if the group is public and the user has access to the group's region", () => {
      const user = {
        id: 1,
        permissions: [
          {
            region: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }

      const grants = [
        {
          region: 1,
        },
      ]

      const group = { isPublic: true }

      const g = new Group(user, grants, group)

      expect(g.canUseGroup()).toBe(true)
    })

    it("should return false if the group is public but the user does not have access to the group's region", () => {
      const user = {
        id: 1,
        permissions: [
          {
            regionId: 1,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }

      const grants = [
        {
          regionId: 2,
        },
      ]

      const group = { isPublic: true }

      const g = new Group(user, grants, group)

      expect(g.canUseGroup()).toBe(false)
    })

    it('should return false if the user is not a collaborator and the group is not public', () => {
      const user = { id: 1 }
      const group = { isPublic: false }

      const g = new Group(user, [], group)

      expect(g.canUseGroup()).toBe(false)
    })
  })
})
