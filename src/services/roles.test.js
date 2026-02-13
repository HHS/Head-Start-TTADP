import { Op } from 'sequelize'
import { Role } from '../models'
import { getAllRoles } from './roles' // Adjust the import path as necessary

jest.mock('../models', () => ({
  Role: {
    findAll: jest.fn(),
  },
}))

describe('getAllRoles', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('should fetch all roles when onlySpecialistRoles is false', async () => {
    const roles = [{ id: 1, name: 'Admin', isSpecialist: false }]
    Role.findAll.mockResolvedValue(roles)

    const result = await getAllRoles()
    expect(result).toEqual(roles)
    expect(Role.findAll).toHaveBeenCalledWith({
      raw: true,
      where: { deletedAt: { [Op.eq]: null } },
    })
  })

  it('should fetch only specialist roles when onlySpecialistRoles is true', async () => {
    const roles = [{ id: 2, name: 'Specialist', isSpecialist: true }]
    Role.findAll.mockResolvedValue(roles)

    const result = await getAllRoles(true)
    expect(result).toEqual(roles)
    expect(Role.findAll).toHaveBeenCalledWith({
      raw: true,
      where: { deletedAt: { [Op.eq]: null }, isSpecialist: true },
    })
  })
})
