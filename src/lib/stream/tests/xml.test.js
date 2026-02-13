import { Readable } from 'stream'
import XMLStream from '../xml'

describe('XMLStream', () => {
  let mockStream
  let xmlStream

  beforeEach(() => {
    // Create a mock stream that can be used to simulate XML data input
    mockStream = new Readable({
      read() {
        this.push('<AMS_ReviewerRole><RoleId>6610</RoleId><Name>ReviewLead</Name></AMS_ReviewerRole>')
        this.push('<AMS_ReviewerRole><RoleId>6620</RoleId><Name>Reviewer</Name></AMS_ReviewerRole>')
        this.push('<AMS_ReviewerRole><RoleId>6630</RoleId><Name>MonitoringEventCoordinator</Name></AMS_ReviewerRole>')
        this.push('<AMS_ReviewerRole><RoleId>6640</RoleId><Name>Analyst</Name></AMS_ReviewerRole>')
        this.push('<AMS_ReviewerRole><RoleId>6650</RoleId><Name>FieldOperationsManager</Name></AMS_ReviewerRole>')
        this.push('<AMS_ReviewerRole><RoleId>6660</RoleId><Name>FiscalSpecialist</Name></AMS_ReviewerRole>')
        this.push('<AMS_ReviewerRole><RoleId>13044</RoleId><Name>CLASS Reviewer (dual coded)</Name></AMS_ReviewerRole>')
        this.push(null) // No more data
      },
    })
    xmlStream = new XMLStream(mockStream, true)
  })

  test('initialize should parse XML data and resolve', async () => {
    await expect(xmlStream.initialize()).resolves.toBeUndefined()
  })

  test('getObjectCount should return the number of parsed objects', async () => {
    await xmlStream.initialize()
    expect(xmlStream.getObjectCount()).toBe(7)
  })

  test('processingComplete should return true when stream is ended', async () => {
    await xmlStream.initialize()
    expect(xmlStream.processingComplete()).toBe(true)
  })

  test('getNextObject should resolve with the next parsed object', async () => {
    await xmlStream.initialize()
    expect(xmlStream.getObjectCount()).toBe(7)
    await expect(xmlStream.getNextObject(true)).resolves.toEqual({
      roleid: 6610,
      name: 'ReviewLead',
    })
    await expect(xmlStream.getNextObject(true)).resolves.toEqual({ roleid: 6620, name: 'Reviewer' })
    await expect(xmlStream.getNextObject(true)).resolves.toEqual({
      roleid: 6630,
      name: 'MonitoringEventCoordinator',
    })
    await expect(xmlStream.getNextObject(true)).resolves.toEqual({ roleid: 6640, name: 'Analyst' })
    await expect(xmlStream.getNextObject(true)).resolves.toEqual({
      roleid: 6650,
      name: 'FieldOperationsManager',
    })
    await expect(xmlStream.getNextObject(true)).resolves.toEqual({
      roleid: 6660,
      name: 'FiscalSpecialist',
    })
    await expect(xmlStream.getNextObject(true)).resolves.toEqual({
      roleid: 13044,
      name: 'CLASS Reviewer (dual coded)',
    })
  })

  test('getNextObject should resolve with null when all objects are retrieved', async () => {
    await xmlStream.initialize()
    const promises = []
    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < 7; i++) {
      promises.push(xmlStream.getNextObject()) // Retrieve all objects
    }
    await Promise.all(promises)
    await expect(xmlStream.getNextObject()).resolves.toBeNull()
  })

  test('getObjectSchema should resolve with the JSON schema of the first parsed object', async () => {
    await xmlStream.initialize()
    await expect(xmlStream.getObjectSchema()).resolves.toEqual({
      attributes: {},
      children: {
        name: {
          optional: false,
          type: 'string',
        },
        roleid: {
          optional: false,
          type: 'number',
        },
      },
      name: 'ams_reviewerrole',
      optional: false,
    })
  })

  test('getObjectSchema should resolve with an empty string if no objects have been parsed', async () => {
    // Create a mock stream with no data
    const emptyStream = new Readable({
      read() {
        this.push(null) // No more data
      },
    })
    const emptyXmlStream = new XMLStream(emptyStream, true)
    await emptyXmlStream.initialize()
    await expect(emptyXmlStream.getObjectSchema()).resolves.toBe(null)
  })
})
