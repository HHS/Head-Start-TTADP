import { Op } from 'sequelize'
import faker from '@faker-js/faker'
import { createGoal, createGrant } from '../../testUtils'
import filtersToScopes from '../index'
import { Goal, Grant, Group, GroupGrant, User, GroupCollaborator } from '../../models'

const REGION_ID = 10

describe('goal filtersToScopes', () => {
  describe('groups', () => {
    let group
    let grantForGroups
    let goalForGroups
    const possibleGoalIds = []

    const userName = faker.datatype.string(100)

    const mockUser = {
      id: faker.datatype.number(),
      homeRegionId: REGION_ID,
      name: userName,
      hsesUsername: userName,
      hsesUserId: userName,
    }

    beforeAll(async () => {
      grantForGroups = await createGrant({
        regionId: REGION_ID,
        number: faker.datatype.string(100),
      })
      await User.create(mockUser)

      group = await Group.create({
        name: `${faker.company.companyName()} - ${faker.animal.cetacean()} - ${faker.datatype.number()}`,
        userId: mockUser.id,
        isPublic: false,
      })

      await GroupCollaborator.create({
        groupId: group.id,
        userId: mockUser.id,
        collaboratorTypeId: 1,
      })

      await GroupGrant.create({
        groupId: group.id,
        grantId: grantForGroups.id,
      })

      goalForGroups = await createGoal({
        grantId: grantForGroups.id,
        status: 'Not Started',
      })
    })

    afterAll(async () => {
      await Goal.destroy({
        where: {
          id: goalForGroups.id,
        },
        individualHooks: true,
        force: true,
      })

      await GroupGrant.destroy({
        where: {
          groupId: group.id,
        },
        individualHooks: true,
      })

      await GroupCollaborator.destroy({
        where: {
          groupId: group.id,
        },
        individualHooks: true,
      })

      await Group.destroy({
        where: {
          id: group.id,
        },
        individualHooks: true,
      })

      await Grant.destroy({
        where: {
          id: grantForGroups.id,
        },
        individualHooks: true,
      })

      await User.destroy({
        where: {
          id: mockUser.id,
        },
        individualHooks: true,
      })
    })

    it('within', async () => {
      const filters = { 'group.in': group.id }
      const { goal: scope } = await filtersToScopes(filters, { userId: mockUser.id })
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: [...possibleGoalIds, goalForGroups.id],
            },
          ],
        },
      })

      expect(found.length).toBe(1)
      expect(found.map((g) => g.name)).toContain(goalForGroups.name)
    })

    it('without', async () => {
      const filters = { 'group.nin': group.id }
      const { goal: scope } = await filtersToScopes(filters, { userId: mockUser.id })
      const found = await Goal.findAll({
        where: {
          [Op.and]: [
            scope,
            {
              id: [...possibleGoalIds, goalForGroups.id],
            },
          ],
        },
      })

      expect(found.length).toBe(possibleGoalIds.length)
      expect(found.map((g) => g.id)).not.toContain(goalForGroups.id)
    })
  })
})
