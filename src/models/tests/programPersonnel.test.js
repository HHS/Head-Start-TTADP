import faker from '@faker-js/faker'
import db, { Recipient, Grant, Program, ProgramPersonnel } from '..'
import { GRANT_PERSONNEL_ROLES } from '../../constants'

describe('ProgramPersonnel', () => {
  let grant
  let recipient
  let program
  let ehsProgram
  let weirdProgram
  let baseProgramPersonnel
  let programPersonnel

  const BASE_PERSONNEL = {
    role: GRANT_PERSONNEL_ROLES[0],
    active: false,
    prefix: 'Mr.',
    firstName: 'John',
    lastName: 'Doe',
    suffix: 'Jr.',
    title: 'Director',
    email: 'john.doe@test.gov',
    effectiveDate: '2023-01-01',
    mapsTo: null,
  }

  beforeAll(async () => {
    // Recipient.
    recipient = await Recipient.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      name: faker.company.companyName(),
      uei: 'BNA5N2FDWGN2',
    })

    // Grant.
    grant = await Grant.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      status: 'Active',
      regionId: 1,
      number: '43CDFW001',
      recipientId: recipient.id,
      startDate: '2023-01-01',
      endDate: '2025-12-31',
    })

    // Program.
    program = await Program.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      grantId: grant.id,
      name: 'Sample Program Personnel',
      programType: 'HS',
      startYear: '2023',
      status: 'active',
      startDate: new Date('01/01/2023'),
      endDate: new Date('01/01/2025'),
    })

    ehsProgram = await Program.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      grantId: grant.id,
      name: 'Sample Program Personnel ehs',
      programType: 'EHS',
      startYear: '2023',
      status: 'active',
      startDate: new Date('01/01/2023'),
      endDate: new Date('01/01/2025'),
    })

    weirdProgram = await Program.create({
      id: faker.datatype.number({ min: 10000, max: 100000 }),
      grantId: grant.id,
      name: 'Sample Program Personnel weird',
      programType: 'something-weird',
      startYear: '2023',
      status: 'active',
      startDate: new Date('01/01/2023'),
      endDate: new Date('01/01/2025'),
    })

    // Grant Personnel.
    baseProgramPersonnel = await ProgramPersonnel.create({
      ...BASE_PERSONNEL,
      grantId: grant.id,
      programId: program.id,
    })

    // Grant Personnel.
    programPersonnel = await ProgramPersonnel.create({
      grantId: grant.id,
      programId: program.id,
      role: GRANT_PERSONNEL_ROLES[0],
      active: true,
      prefix: 'Mr.',
      firstName: 'John',
      lastName: 'Doe',
      suffix: 'Jr.',
      title: 'Director',
      email: 'john.doe@test.gov',
      effectiveDate: '2023-01-01',
      mapsTo: baseProgramPersonnel.id,
    })
  })
  afterAll(async () => {
    // Delete Grant Personnel.
    await ProgramPersonnel.destroy({
      where: {
        grantId: grant.id,
      },
    })

    // Delete Program.
    await Program.destroy({
      where: {
        id: [program.id, ehsProgram.id, weirdProgram.id],
      },
    })

    // Delete Grant.
    await Grant.destroy({
      where: {
        id: grant.id,
      },
      individualHooks: true,
    })

    // Delete Recipient.
    await Recipient.destroy({
      where: {
        id: recipient.id,
      },
    })

    await db.sequelize.close()
  })

  it('programPersonnel', async () => {
    // Get Grant Personnel.
    let programPersonnelToCheck = await ProgramPersonnel.findOne({
      where: {
        grantId: grant.id,
        active: true,
      },
    })
    const ppId = programPersonnelToCheck.id
    // Assert all grant personnel values.
    expect(programPersonnelToCheck).toHaveProperty('id')
    expect(programPersonnelToCheck.grantId).toEqual(grant.id)
    expect(programPersonnelToCheck.programId).toEqual(program.id)
    expect(programPersonnelToCheck.role).toEqual(GRANT_PERSONNEL_ROLES[0])
    expect(programPersonnelToCheck.active).toEqual(true)
    expect(programPersonnelToCheck.prefix).toEqual('Mr.')
    expect(programPersonnelToCheck.firstName).toEqual('John')
    expect(programPersonnelToCheck.lastName).toEqual('Doe')
    expect(programPersonnelToCheck.suffix).toEqual('Jr.')
    expect(programPersonnelToCheck.title).toEqual('Director')
    expect(programPersonnelToCheck.email).toEqual('john.doe@test.gov')
    expect(programPersonnelToCheck.mapsTo).toEqual(baseProgramPersonnel.id)

    // Update Grant Personnel.
    programPersonnelToCheck = await programPersonnel.update({
      id: programPersonnelToCheck.id,
      role: GRANT_PERSONNEL_ROLES[4],
      active: false,
      prefix: 'Ms.',
      firstName: 'Jane',
      lastName: 'Doe',
      suffix: 'Sr2.',
      title: 'Director2',
      email: 'jane.doe@test.gov',
      effectiveDate: '2023-01-02',
      mapsTo: null,
    })

    // Assert all grant personnel values.
    programPersonnelToCheck = await ProgramPersonnel.findOne({
      where: {
        id: ppId,
      },
    })

    expect(programPersonnelToCheck).toHaveProperty('id')
    expect(programPersonnelToCheck.grantId).toEqual(grant.id)
    expect(programPersonnelToCheck.role).toEqual(GRANT_PERSONNEL_ROLES[4])
    expect(programPersonnelToCheck.active).toEqual(false)
    expect(programPersonnelToCheck.prefix).toEqual('Ms.')
    expect(programPersonnelToCheck.firstName).toEqual('Jane')
    expect(programPersonnelToCheck.lastName).toEqual('Doe')
    expect(programPersonnelToCheck.suffix).toEqual('Sr2.')
    expect(programPersonnelToCheck.title).toEqual('Director2')
    expect(programPersonnelToCheck.email).toEqual('jane.doe@test.gov')
    expect(programPersonnelToCheck.mapsTo).toEqual(null)

    // check virtual fields
    expect(programPersonnelToCheck.fullName).toEqual('Jane Doe')
    expect(programPersonnelToCheck.nameAndRole).toEqual('Jane Doe - director')

    programPersonnelToCheck = await ProgramPersonnel.findOne({
      where: {
        id: ppId,
      },
      include: [
        {
          model: Program,
          as: 'program',
        },
      ],
    })

    expect(programPersonnelToCheck.fullName).toEqual('Jane Doe')
    expect(programPersonnelToCheck.nameAndRole).toEqual('Jane Doe - Director for Head Start')
  })

  it('grant returns grant personnel', async () => {
    // Get Grant.
    grant = await Grant.findOne({
      where: {
        id: grant.id,
      },
      include: [
        {
          model: ProgramPersonnel,
          as: 'programPersonnel',
        },
      ],
    })

    // Assert there are two program personnel.
    expect(grant.programPersonnel.length).toBe(2)
  })

  it('returns the correct data for CFO', async () => {
    await ProgramPersonnel.bulkCreate([
      {
        ...BASE_PERSONNEL,
        role: 'cfo',
        programId: program.id,
        grantId: grant.id,
      },
      {
        ...BASE_PERSONNEL,
        role: 'cfo',
        programId: ehsProgram.id,
        grantId: grant.id,
      },
      {
        ...BASE_PERSONNEL,
        role: 'cfo',
        programId: weirdProgram.id,
        grantId: grant.id,
      },
    ])

    const personnel = await ProgramPersonnel.findAll({
      where: {
        role: 'cfo',
        grantId: grant.id,
      },
      include: [
        {
          model: Program,
          as: 'program',
        },
      ],
    })

    expect(personnel.length).toBe(3)

    const fullRoles = personnel.map((p) => p.fullRole)

    expect(fullRoles).toContain('Chief Financial Officer for Head Start')
    expect(fullRoles).toContain('Chief Financial Officer for Early Head Start')
    expect(fullRoles).toContain('Chief Financial Officer')
  })
})
