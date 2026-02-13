import { Op } from 'sequelize'
import faker from '@faker-js/faker'
import { Goal, Grant, Recipient, sequelize } from '../../models'
import { createGoal, createGrant, createRecipient } from '../../testUtils'
import filtersToScopes from '../index'
import { GOAL_STATUS } from '../../constants'

describe('goalName', () => {
  const goalNameIncluded = `${faker.lorem.sentences(5)}_pig`
  const goalNameExcluded = `${faker.lorem.sentences(5)}_dog`

  let recipientForGoalName
  let otherRecipient
  let grantForGoalExcluded
  let grantForGoalIncluded
  let grantForOtherRecipent

  let goalNameFilterPossibleIds

  beforeAll(async () => {
    recipientForGoalName = await createRecipient()
    otherRecipient = await createRecipient()
    grantForOtherRecipent = await createGrant({ recipientId: otherRecipient.id })
    grantForGoalExcluded = await createGrant({ recipientId: recipientForGoalName.id })
    grantForGoalIncluded = await createGrant({ recipientId: recipientForGoalName.id })
    goalNameFilterPossibleIds = [grantForGoalIncluded.id, grantForGoalExcluded.id, grantForOtherRecipent.id]
    await createGoal({
      grantId: grantForGoalIncluded.id,
      name: goalNameIncluded,
      status: GOAL_STATUS.NOT_STARTED,
    })

    await createGoal({
      grantId: grantForGoalExcluded.id,
      name: goalNameExcluded,
      status: GOAL_STATUS.NOT_STARTED,
    })

    await createGoal({
      grantId: grantForOtherRecipent.id,
      name: 'fiddler fiddly fiddloo',
      status: GOAL_STATUS.NOT_STARTED,
    })
  })

  afterAll(async () => {
    await Goal.destroy({
      where: {
        grantId: [grantForGoalIncluded.id, grantForGoalExcluded.id, grantForOtherRecipent.id],
      },
      force: true,
    })

    await Grant.destroy({
      where: {
        id: [grantForGoalIncluded.id, grantForGoalExcluded.id, grantForOtherRecipent.id],
      },
      individualHooks: true,
    })

    await Recipient.destroy({
      where: {
        id: [recipientForGoalName.id, otherRecipient.id],
      },
    })

    await sequelize.close()
  })

  it('filters by', async () => {
    const filters = { 'goalName.ctn': '_pig' }
    const scope = await filtersToScopes(filters)
    const found = await Recipient.findAll({
      include: [
        {
          attributes: ['id'],
          model: Grant.unscoped(),
          as: 'grants',
          required: true,
          where: { [Op.and]: [scope.grant.where, { id: goalNameFilterPossibleIds }] },
          include: scope.grant.include,
        },
      ],
    })

    expect(found.length).toBe(1)
    const [recip] = found
    expect(recip.id).toBe(recipientForGoalName.id)
  })

  it('filters out', async () => {
    const filters = { 'goalName.nctn': '_pig' }
    const scope = await filtersToScopes(filters)
    const found = await Recipient.findAll({
      include: [
        {
          attributes: ['id'],
          model: Grant.unscoped(),
          as: 'grants',
          required: true,
          where: { [Op.and]: [scope.grant.where, { id: goalNameFilterPossibleIds }] },
          include: scope.grant.include,
        },
      ],
    })
    expect(found.length).toBe(1)
    const [recip] = found
    expect(recip.id).toBe(otherRecipient.id)
  })
})
