import db, { User, Permission } from '../models'
import {
  validateUserAuthForAccess,
  validateUserAuthForAdmin,
  getUserReadRegions,
  setReadRegions,
  getUserTrainingReportReadRegions,
  setTrainingReportReadRegions,
  isCentralOffice,
  userIsPocRegionalCollaborator,
} from './accessValidation'
import SCOPES from '../middleware/scopeConstants'

const { SITE_ACCESS, ADMIN, READ_REPORTS, READ_WRITE_REPORTS, READ_WRITE_TRAINING_REPORTS } = SCOPES

const mockUser = {
  id: 47,
  name: 'Joe Green',
  title: null,
  phoneNumber: '555-555-554',
  hsesUserId: '47',
  email: 'test47@test.com',
  hsesUsername: 'test47@test.com',
  homeRegionId: 1,
  permissions: [
    {
      userId: 47,
      regionId: 14,
      scopeId: ADMIN,
    },
    {
      userId: 47,
      regionId: 14,
      scopeId: SITE_ACCESS,
    },
  ],
  lastLogin: new Date(),
}

const setupUser = async (user) => {
  await User.destroy({ where: { id: user.id } })
  await User.create(user, {
    include: [{ model: Permission, as: 'permissions' }],
  })
}

describe('accessValidation', () => {
  afterAll(async () => {
    await db.sequelize.close()
  })

  describe('userIsPocRegionalCollaborator', () => {
    it('returns true if a user has the collaborator scope and not the read scopes', async () => {
      const user = {
        ...mockUser,
        permissions: [
          {
            userId: 47,
            regionId: 14,
            scopeId: SCOPES.POC_TRAINING_REPORTS,
          },
        ],
      }
      await setupUser(user)

      const valid = await userIsPocRegionalCollaborator(user.id)
      expect(valid).toBe(true)
    })

    it('returns false if a user has the collaborator scope and the read scope', async () => {
      const user = {
        ...mockUser,
        permissions: [
          {
            userId: 47,
            regionId: 14,
            scopeId: SCOPES.POC_TRAINING_REPORTS,
          },
          {
            userId: 47,
            regionId: 14,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }
      await setupUser(user)

      const valid = await userIsPocRegionalCollaborator(user.id)
      expect(valid).toBe(false)
    })

    it('returns false if a user does not have the collaborator scope', async () => {
      const user = {
        ...mockUser,
        permissions: [
          {
            userId: 47,
            regionId: 14,
            scopeId: SCOPES.READ_REPORTS,
          },
        ],
      }
      await setupUser(user)

      const valid = await userIsPocRegionalCollaborator(user.id)
      expect(valid).toBe(false)
    })
  })

  describe('isCentralOffice', () => {
    it('is true for CO users', async () => {
      await setupUser({ ...mockUser, homeRegionId: 14 })
      const isCentralOfficeUser = await isCentralOffice(mockUser.id)
      expect(isCentralOfficeUser).toBeTruthy()
      await User.destroy({ where: { id: mockUser.id } })
    })

    it('is false for non CO users', async () => {
      await setupUser({ ...mockUser, homeRegionId: 1 })
      const isCentralOfficeUser = await isCentralOffice(mockUser.id)
      expect(isCentralOfficeUser).toBeFalsy()
      await User.destroy({ where: { id: mockUser.id } })
    })
  })

  describe('validateUserAuthForAccess', () => {
    it('returns true if a user has SITE_ACCESS priviledges', async () => {
      await setupUser(mockUser)

      const valid = await validateUserAuthForAccess(mockUser.id)
      expect(valid).toBe(true)
    })

    it('returns false if a user does not have SITE_ACCESS', async () => {
      const user = {
        ...mockUser,
        permissions: [],
      }
      await setupUser(user)

      const valid = await validateUserAuthForAccess(mockUser.id)
      expect(valid).toBe(false)
    })
  })

  describe('validateUserAuthForAdmin', () => {
    it('returns true if a user has admin priviledges', async () => {
      await setupUser(mockUser)

      const valid = await validateUserAuthForAdmin(mockUser.id)
      expect(valid).toBe(true)
    })

    it('returns false if a user does not have admin priviledges', async () => {
      const user = {
        ...mockUser,
        permissions: [mockUser.permissions[1]],
      }
      await setupUser(user)

      const valid = await validateUserAuthForAdmin(user.id)
      expect(valid).toBe(false)
    })

    it('returns false if a user does not exist in database', async () => {
      await User.destroy({ where: { id: mockUser.id } })

      const valid = await validateUserAuthForAdmin(mockUser.id)
      expect(valid).toBe(false)
    })

    it('false on invalid', async () => {
      const invalid = await validateUserAuthForAdmin(undefined)
      expect(invalid).toBe(false)
    })
  })

  describe('getUserReadRegions', () => {
    it('returns an array of regions user has permissions to', async () => {
      await setupUser(mockUser)
      await Permission.create({
        scopeId: READ_REPORTS,
        userId: mockUser.id,
        regionId: 14,
      })
      await Permission.create({
        scopeId: READ_WRITE_REPORTS,
        userId: mockUser.id,
        regionId: 13,
      })

      const regions = await getUserReadRegions(mockUser.id)

      expect(regions.length).toBe(2)
      expect(regions).toContain(13)
      expect(regions).toContain(14)
    })

    it('returns an empty array if user has no permissions', async () => {
      await setupUser(mockUser)

      const regions = await getUserReadRegions(mockUser.id)
      expect(regions.length).toBe(0)
    })

    it('returns an empty array if a user does not exist in database', async () => {
      await User.destroy({ where: { id: mockUser.id } })

      const regions = await getUserReadRegions(mockUser.id)
      expect(regions.length).toBe(0)
    })

    it('Throws on error', async () => {
      await expect(getUserReadRegions(undefined)).rejects.toThrow()
    })
  })

  describe('getUserTrainingReportReadRegions', () => {
    it('returns an array of regions user has permissions to', async () => {
      await setupUser(mockUser)
      await Permission.create({
        scopeId: READ_REPORTS,
        userId: mockUser.id,
        regionId: 14,
      })
      await Permission.create({
        scopeId: READ_WRITE_TRAINING_REPORTS,
        userId: mockUser.id,
        regionId: 13,
      })

      const regions = await getUserTrainingReportReadRegions(mockUser.id)

      expect(regions.length).toBe(2)
      expect(regions).toContain(13)
      expect(regions).toContain(14)
    })

    it('returns an empty array if user has no permissions', async () => {
      await setupUser(mockUser)

      const regions = await getUserTrainingReportReadRegions(mockUser.id)
      expect(regions.length).toBe(0)
    })

    it('returns an empty array if a user does not exist in database', async () => {
      await User.destroy({ where: { id: mockUser.id } })

      const regions = await getUserTrainingReportReadRegions(mockUser.id)
      expect(regions.length).toBe(0)
    })

    it('Throws on error', async () => {
      await expect(getUserTrainingReportReadRegions(undefined)).rejects.toThrow()
    })
  })

  describe('setReadRegions', () => {
    it('filters out regions user does not have permissions to', async () => {
      await setupUser(mockUser)
      await Permission.create({
        scopeId: READ_REPORTS,
        userId: mockUser.id,
        regionId: 14,
      })
      await Permission.create({
        scopeId: READ_WRITE_REPORTS,
        userId: mockUser.id,
        regionId: 13,
      })

      const query = { 'region.in': [1, 13, 14] }

      const queryWithFilteredRegions = await setReadRegions(query, mockUser.id)

      expect(queryWithFilteredRegions).toStrictEqual({ 'region.in': [13, 14] })
    })

    it('returns all regions user has permissions to if region not specified', async () => {
      await setupUser(mockUser)

      await Permission.create({
        scopeId: READ_REPORTS,
        userId: mockUser.id,
        regionId: 14,
      })
      await Permission.create({
        scopeId: READ_WRITE_REPORTS,
        userId: mockUser.id,
        regionId: 13,
      })

      const query = {}

      const queryWithFilteredRegions = await setReadRegions(query, mockUser.id)
      const queryRegions = queryWithFilteredRegions['region.in']
      expect(queryRegions.length).toBe(2)

      ;[14, 13].forEach((region) => {
        expect(queryRegions).toContain(region)
      })
    })

    it('returns an empty array if user has no permissions', async () => {
      await setupUser(mockUser)

      const query = { 'region.in': [1, 13, 14] }

      const queryWithFilteredRegions = await setReadRegions(query, mockUser.id)

      expect(queryWithFilteredRegions).toStrictEqual({ 'region.in': [] })
    })

    it('returns all read regions for central office users', async () => {
      await Permission.create({
        scopeId: READ_REPORTS,
        userId: mockUser.id,
        regionId: 14,
      })
      await Permission.create({
        scopeId: READ_WRITE_REPORTS,
        userId: mockUser.id,
        regionId: 13,
      })

      const query = { 'region.in': [14] }
      const queryWithFilteredRegions = await setReadRegions(query, mockUser.id)
      const queryRegions = queryWithFilteredRegions['region.in']

      ;[14, 13].forEach((region) => {
        expect(queryRegions).toContain(region)
      })
    })

    it('returns an empty array if a user does not exist in database', async () => {
      await User.destroy({ where: { id: mockUser.id } })

      const query = { 'region.in': [1, 13, 14] }

      const queryWithFilteredRegions = await setReadRegions(query, mockUser.id)

      expect(queryWithFilteredRegions).toStrictEqual({ 'region.in': [] })
    })
  })
  describe('setTrainingReportReadRegions', () => {
    it('filters out regions user does not have permissions to', async () => {
      await setupUser(mockUser)
      await Permission.create({
        scopeId: READ_REPORTS,
        userId: mockUser.id,
        regionId: 14,
      })
      await Permission.create({
        scopeId: READ_WRITE_TRAINING_REPORTS,
        userId: mockUser.id,
        regionId: 13,
      })

      const query = { 'region.in': [1, 13, 14] }

      const queryWithFilteredRegions = await setTrainingReportReadRegions(query, mockUser.id)

      expect(queryWithFilteredRegions).toStrictEqual({ 'region.in': [13, 14] })
    })

    it('returns all regions user has permissions to if region not specified', async () => {
      await setupUser(mockUser)

      await Permission.create({
        scopeId: READ_REPORTS,
        userId: mockUser.id,
        regionId: 14,
      })
      await Permission.create({
        scopeId: READ_WRITE_TRAINING_REPORTS,
        userId: mockUser.id,
        regionId: 13,
      })

      const query = {}

      const queryWithFilteredRegions = await setTrainingReportReadRegions(query, mockUser.id)
      const queryRegions = queryWithFilteredRegions['region.in']
      expect(queryRegions.length).toBe(2)

      ;[14, 13].forEach((region) => {
        expect(queryRegions).toContain(region)
      })
    })

    it('returns an empty array if user has no permissions', async () => {
      await setupUser(mockUser)

      const query = { 'region.in': [1, 13, 14] }

      const queryWithFilteredRegions = await setTrainingReportReadRegions(query, mockUser.id)

      expect(queryWithFilteredRegions).toStrictEqual({ 'region.in': [] })
    })

    it('returns all read regions for central office users', async () => {
      await Permission.create({
        scopeId: READ_REPORTS,
        userId: mockUser.id,
        regionId: 14,
      })
      await Permission.create({
        scopeId: READ_WRITE_TRAINING_REPORTS,
        userId: mockUser.id,
        regionId: 13,
      })

      const query = { 'region.in': [14] }
      const queryWithFilteredRegions = await setTrainingReportReadRegions(query, mockUser.id)
      const queryRegions = queryWithFilteredRegions['region.in']

      ;[14, 13].forEach((region) => {
        expect(queryRegions).toContain(region)
      })
    })

    it('returns an empty array if a user does not exist in database', async () => {
      await User.destroy({ where: { id: mockUser.id } })

      const query = { 'region.in': [1, 13, 14] }

      const queryWithFilteredRegions = await setTrainingReportReadRegions(query, mockUser.id)

      expect(queryWithFilteredRegions).toStrictEqual({ 'region.in': [] })
    })
  })
})
