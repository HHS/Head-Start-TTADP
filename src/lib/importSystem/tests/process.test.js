import { DataTypes, Op } from 'sequelize'
import processRecords from '../processRecords'
import XMLStream from '../../stream/xml'
import { modelForTable } from '../../modelUtils'

// Mock the external modules
jest.mock('../../stream/xml')
jest.mock('../../../models')

const mockFindOne = jest.fn()
const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockDestroy = jest.fn()
const mockDescribe = jest.fn()
jest.mock('../../modelUtils', () => {
  const actualModelUtils = jest.requireActual('../../modelUtils')
  return {
    filterDataToModel: actualModelUtils.filterDataToModel,
    modelForTable: jest.fn(() => ({
      findOne: mockFindOne,
      create: mockCreate,
      update: mockUpdate,
      destroy: mockDestroy,
      describe: mockDescribe,
    })),
  }
})

describe('processRecords', () => {
  const mockXmlClient = new XMLStream(true)
  const mockGetNextObject = jest.fn()
  mockXmlClient.getNextObject = mockGetNextObject

  const processDefinition = {
    fileName: 'AMS_FindingHistory.xml',
    encoding: 'utf16le',
    tableName: 'MonitoringFindingHistories',
    keys: ['findingHistoryId'],
    remapDef: {
      FindingHistoryId: 'findingHistoryId',
      ReviewId: 'reviewId',
      '.': 'toHash.*',
    },
  }

  const fileDate = new Date('2024-01-01')
  let recordActions

  beforeEach(() => {
    jest.clearAllMocks()
    recordActions = {
      inserts: [],
      updates: [],
      deletes: [],
      errors: [],
    }
  })

  it('should process a record and add it to inserts if it is new', async () => {
    const mockRecord = {
      reviewid: '45c95636-bc62-11ee-9813-837372b0ff39',
      findinghistoryid: '4791bc9c-bc62-11ee-9530-fb12cdb651b3',
    }
    mockXmlClient.getNextObject.mockResolvedValueOnce(mockRecord)

    mockFindOne.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          resolve(null)
        })
    )
    mockCreate.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          resolve({ id: 1 })
        })
    )

    // Define the mock behavior for this test
    mockDescribe.mockResolvedValueOnce({
      reviewId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      findingHistoryId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hash: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    })

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions)

    expect(mockCreate).toHaveBeenCalledWith(
      {
        reviewId: '45c95636-bc62-11ee-9813-837372b0ff39',
        findingHistoryId: '4791bc9c-bc62-11ee-9530-fb12cdb651b3',
        hash: '5920dbae679cbf36b114a28714182ef1350aba3f763cf79d1f8a8a7ba83f13e7',
        sourceCreatedAt: fileDate,
        sourceUpdatedAt: fileDate,
      },
      {
        individualHooks: true,
        returning: true,
      }
    )
    expect(result.inserts).toHaveLength(1)
  })

  it('should process a record and add it to updates if it exists', async () => {
    const mockRecord = {
      reviewId: '45c95636-bc62-11ee-9813-837372b0ff39',
      findingHistoryId: '4791bc9c-bc62-11ee-9530-fb12cdb651b3',
    }
    mockXmlClient.getNextObject.mockResolvedValueOnce(mockRecord)

    mockFindOne.mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          resolve({
            id: 1,
            reviewId: '45c95636-bc62-11ee-9813-837372b0ff39',
            findingHistoryId: '4791bc9c-bc62-11ee-9530-fb12cdb651b3',
            hash: 'a27c9d4ce22e472c6ab7e08374d6789069dcf2fedbbc4e10392661838d96fe51',
            sourceUpdatedAt: new Date('2023-12-30'),
          })
        })
    )

    mockUpdate.mockResolvedValue({ id: 1 })

    // Define the mock behavior for this test
    mockDescribe.mockResolvedValueOnce({
      reviewId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      findingHistoryId: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      hash: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    })

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions)

    expect(mockUpdate).toHaveBeenCalledWith(
      {
        hash: 'a27c9d4ce22e472c6ab7e08374d6789069dcf2fedbbc4e10392661838d96fe5c',
        sourceUpdatedAt: expect.any(Date),
        updatedAt: expect.any(Date),
      },
      {
        individualHooks: true,
        returning: true,
        where: {
          id: 1,
        },
      }
    )
    expect(result.updates).toHaveLength(1)
  })

  it('should handle errors and add them to the errors array - getNextObject', async () => {
    const mockError = new Error('Test Error')
    mockXmlClient.getNextObject.mockImplementation(() => {
      throw mockError
    })

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions)

    expect(result.errors).toHaveLength(1)
    expect(result.errors[0]).toBe(mockError.message)
  })

  it('should handle errors and add them to the errors array - modelForTable - not found', async () => {
    const mockRecord = {
      reviewId: '45c95636-bc62-11ee-9813-837372b0ff39',
      findingHistoryId: '4791bc9c-bc62-11ee-9530-fb12cdb651b3',
    }
    mockXmlClient.getNextObject.mockResolvedValueOnce(mockRecord)

    const realModelUtils = jest.requireActual('../../modelUtils')

    modelForTable.mockImplementation(realModelUtils.modelForTable)

    // If you expect processRecords to throw an error, you can mock it like this:
    // processRecords.mockRejectedValueOnce(new Error(
    //   `Unable to find table for '${processDefinition.tableName}'`,
    // ));

    try {
      // Attempt to run processRecords, which is expected to fail
      await processRecords(processDefinition, mockXmlClient, fileDate, recordActions)
      // If processRecords does not throw, force the test to fail
      expect(true).toBe(false)
    } catch (error) {
      // Check that the error is what you expect
      // eslint-disable-next-line jest/no-conditional-expect
      expect(error).toMatchObject({
        inserts: [],
        updates: [],
        deletes: [],
        errors: [`Unable to find table for '${processDefinition.tableName}'`],
      })
    }
  })

  it('should process deletion of records not present in the file', async () => {
    mockGetNextObject.mockResolvedValue(null) // Simulate end of XML stream

    mockDestroy.mockResolvedValue({ id: 3 })

    recordActions.updates.push([1, [{ id: 1 }]])
    recordActions.updates.push([1, [{ id: 2 }]])

    recordActions.inserts.push({ id: 4 })
    recordActions.inserts.push({ id: 5 })

    modelForTable.mockImplementation(
      jest.fn(() => ({
        findOne: mockFindOne,
        create: mockCreate,
        update: mockUpdate,
        destroy: mockDestroy,
        describe: mockDescribe,
      }))
    )

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions)

    expect(mockUpdate).toHaveBeenCalledWith(
      { sourceDeletedAt: expect.any(Date) }, // Correct field name to match implementation
      {
        where: {
          [Op.and]: [{ id: { [Op.notBetween]: [1, 2] } }, { id: { [Op.notBetween]: [4, 5] } }],
          sourceDeletedAt: null,
        },
        individualHooks: true,
      }
    )
    expect(result.deletes).toHaveLength(1)
  })
})
