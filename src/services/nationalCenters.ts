import { auditLogger } from '../logger'
import db from '../models'

const { NationalCenter, User, NationalCenterUser } = db

interface NationalCenterType {
  name: string
  id: number
  users?: [
    {
      id: number
      name: string
    },
  ]
}

interface NCModel extends NationalCenterType {
  destroy: (args: { individualHooks: boolean }) => Promise<void>
  save: () => Promise<void>
  update: (
    args: {
      id: number
      name: string
    },
    options: { individualHooks: boolean }
  ) => Promise<void>
}

export async function findAll(): Promise<NationalCenterType[]> {
  return NationalCenter.findAll({
    attributes: ['id', 'name'],
    include: [
      {
        // National Center Users.
        model: User,
        as: 'users',
        attributes: ['id', 'name'],
      },
    ],
    order: [['name', 'ASC']],
  })
}

export async function findById(id: number): Promise<NCModel> {
  return NationalCenter.findByPk(id, {
    include: [
      {
        // National Center Users.
        model: User,
        as: 'users',
        attributes: ['id', 'name'],
      },
    ],
  })
}

export async function create(nationalCenter: { name: string }, userId: number): Promise<NationalCenterType> {
  // Create NationalCenter.
  const createdNationalCenter = await NationalCenter.create(nationalCenter)

  // If we have a userId, create NationalCenterUser.
  if (userId) {
    // Create NationalCenterUser.
    await NationalCenterUser.create(
      {
        userId,
        nationalCenterId: createdNationalCenter.id,
      },
      { individualHooks: true }
    )
  }
  return findById(createdNationalCenter.id)
}

export async function updateById(id: number, data: { name: string; userId: number }): Promise<NationalCenterType> {
  const existing = await findById(id)
  const existingNationalCenterUser = existing.users.length > 0 ? existing.users[0] : null

  // Update the name.
  if (existing.name !== data.name) {
    // update national center name where for id.
    await NationalCenter.update(
      {
        name: data.name,
      },
      {
        where: { id },
        individualHooks: true,
      }
    )
  } else {
    auditLogger.info(`Name ${data.name} has not changed`)
  }

  // Update national center user.
  if (!data.userId && existingNationalCenterUser && existingNationalCenterUser.id) {
    // Delete NationalCenterUser.
    await NationalCenterUser.destroy({
      where: { nationalCenterId: id },
      individualHooks: true,
    })
  } else if (!existingNationalCenterUser && data.userId) {
    // create new NationalCenterUser.
    await NationalCenterUser.create(
      {
        userId: data.userId,
        nationalCenterId: id,
      },
      { individualHooks: true }
    )
  } else if (existingNationalCenterUser && existingNationalCenterUser.id !== data.userId) {
    // Update existing NationalCenterUser.
    await NationalCenterUser.update(
      {
        userId: data.userId,
      },
      {
        where: { nationalCenterId: id },
        individualHooks: true,
      }
    )
  } else {
    auditLogger.info(`Name ${data.name} has not changed the national center user`)
  }
  return findById(id)
}

export async function deleteById(id: number) {
  // Get national center to delete.
  const toDelete = await findById(id)

  // Delete national center user.
  if (toDelete.users.length) {
    await NationalCenterUser.destroy({
      where: { nationalCenterId: id },
      individualHooks: true,
    })
  }
  // Delete national center.
  return NationalCenter.destroy({
    where: { id },
    individualHooks: true,
  })
}
