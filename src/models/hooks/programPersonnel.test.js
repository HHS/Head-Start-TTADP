import faker from '@faker-js/faker'
import db from '..'

const { ProgramPersonnel, Grant, Program } = db

describe('ProgramPersonnel hooks', () => {
  describe('afterBulkCreate', () => {
    const createProgramPersonnel = async (grantId, programId, role = 'director', active = true) => {
      const personnel = await ProgramPersonnel.create({
        grantId,
        programId,
        role,
        title: '',
        firstName: faker.name.firstName(),
        lastName: faker.name.lastName(),
        suffix: faker.name.suffix(),
        prefix: faker.name.prefix(),
        active,
        effectiveDate: active ? new Date() : new Date('2020/01/01'),
        mapsTo: null,
        email: faker.internet.email(),
      })

      // no way to return associations on create
      // https://github.com/sequelize/sequelize/discussions/15186

      return ProgramPersonnel.findByPk(personnel.id, {
        include: [
          {
            model: Grant,
            as: 'grant',
          },
          {
            model: Program,
            as: 'program',
          },
        ],
      })
    }

    const REGION_ID = 10

    const recipient = {
      name: faker.datatype.string({ min: 10 }),
      id: faker.datatype.number({ min: 10000 }),
      uei: faker.datatype.string({ min: 10 }),
    }

    const grant = {
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      number: `0${faker.datatype.number({ min: 1, max: 9999 })}${faker.animal.type()}`,
      regionId: REGION_ID,
      status: 'Active',
      startDate: new Date('2021/01/01'),
      endDate: new Date(),
      recipientId: recipient.id,
    }

    const dummyProgram = {
      grantId: grant.id,
      startYear: '2023',
      startDate: '2023/01/01',
      endDate: '2023/12/31',
      status: 'Active',
      name: `${faker.animal.type() + faker.company.companyName()} Program`,
      programType: 'HS',
    }

    let program

    beforeAll(async () => {
      await db.Recipient.create(recipient)
      await db.Grant.create(grant)

      program = await db.Program.create({
        ...dummyProgram,
        id: faker.datatype.number({ min: 10000, max: 100000 }),
      })

      await createProgramPersonnel(grant.id, program.id)
      await createProgramPersonnel(grant.id, program.id, 'cfo')
    })

    afterAll(async () => {
      await db.ProgramPersonnel.destroy({
        where: {
          grantId: grant.id,
        },
      })

      await db.Program.destroy({
        where: {
          grantId: grant.id,
        },
      })

      await db.Grant.destroy({
        where: {
          id: grant.id,
        },
        individualHooks: true,
      })

      await db.Recipient.destroy({
        where: {
          id: recipient.id,
        },
      })

      await db.sequelize.close()
    })

    it('updates mapTo on bulkcreate', async () => {
      const personnelBulked = await ProgramPersonnel.bulkCreate(
        [
          {
            grantId: grant.id,
            programId: program.id,
            role: 'director',
            title: '',
            firstName: faker.name.firstName(),
            lastName: faker.name.lastName(),
            suffix: faker.name.suffix(),
            prefix: faker.name.prefix(),
            active: true,
            effectiveDate: new Date(),
            mapsTo: null,
            email: faker.internet.email(),
          },
        ],
        {
          individualHooks: false,
          returning: true,
        }
      )

      const newDirector = personnelBulked[0]

      const personnelForGrant = await ProgramPersonnel.findAll({
        where: {
          grantId: grant.id,
        },
      })

      expect(personnelForGrant.length).toBe(3) // all three, including the two directors

      const activeDirector = personnelForGrant.find((p) => p.role === 'director' && p.active)
      expect(activeDirector.id).toBe(newDirector.id)
      expect(activeDirector.mapsTo).toBe(null)
      const inactiveDirector = personnelForGrant.find((p) => p.role === 'director' && !p.active)
      expect(inactiveDirector.mapsTo).toBe(activeDirector.id)
      const cfo = personnelForGrant.find((p) => p.role === 'cfo' && p.active)
      expect(cfo).toBeTruthy()
    })
  })
})
