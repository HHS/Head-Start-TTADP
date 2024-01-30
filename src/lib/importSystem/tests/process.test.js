// processRecords.test.ts
import { DataTypes } from 'sequelize';
import { processRecords } from '../process';
import XMLStream from '../../stream/xml';
import db from '../../../models';
import { modelForTable } from '../../modelUtils';

// Mock the external modules
jest.mock('../../stream/xml');
jest.mock('../../../models');

// jest.mock('../../modelUtils', () => {
//   const actualModelUtils = jest.requireActual('../../modelUtils');
//   return {
//     filterDataToModel: actualModelUtils.filterDataToModel,
//     // Return a function that itself returns the mock model when called
//     modelForTable: jest.fn(() => ({
//       findOne: jest.fn().mockResolvedValue(null),
//       create: jest.fn().mockResolvedValue({ id: 1 }),
//       update: jest.fn(),
//       destroy: jest.fn(),
//       describe: jest.fn().mockResolvedValue({
//         // Simulate the model description
//         reviewId: {
//           type: 'text', // Sequelize.TEXT,
//           allowNull: true,
//         },
//         findingHistoryId: {
//           type: 'text', // Sequelize.TEXT,
//           allowNull: true,
//         },
//         // Add other fields as necessary
//       }),
//       // Add other methods or properties as needed for your tests
//     })),
//   };
// });
const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();
const mockDestroy = jest.fn();
const mockDescribe = jest.fn();
jest.mock('../../modelUtils', () => {
  const actualModelUtils = jest.requireActual('../../modelUtils');
  return {
    filterDataToModel: actualModelUtils.filterDataToModel,
    modelForTable: jest.fn(() => ({
      findOne: mockFindOne,
      create: mockCreate,
      update: mockUpdate,
      destroy: mockDestroy,
      describe: mockDescribe, // Don't define the mockResolvedValue here
      // Add other methods or properties as needed for your tests
    })),
  };
});

describe('processRecords', () => {
  const mockXmlClient = new XMLStream(true);
  const mockGetNextObject = jest.fn();
  mockXmlClient.getNextObject = mockGetNextObject;

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
  };

  const fileDate = new Date();
  const recordActions = {
    inserts: [],
    updates: [],
    deletes: [],
    errors: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should process a record and add it to inserts if it is new', async () => {
    const mockRecord = {
      reviewId: '45c95636-bc62-11ee-9813-837372b0ff39',
      findingHistoryId: '4791bc9c-bc62-11ee-9530-fb12cdb651b3',
    };
    mockXmlClient.getNextObject.mockResolvedValueOnce(mockRecord);

    mockFindOne.mockImplementation(() => new Promise((resolve, reject) => {
      resolve(null);
    }));
    mockCreate.mockImplementation(() => new Promise((resolve, reject) => {
      resolve({ id: 1 });
    }));

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
    });

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions);

    expect(mockCreate).toHaveBeenCalledWith(
      {
        reviewId: '45c95636-bc62-11ee-9813-837372b0ff39',
        findingHistoryId: '4791bc9c-bc62-11ee-9530-fb12cdb651b3',
        hash: 'a27c9d4ce22e472c6ab7e08374d6789069dcf2fedbbc4e10392661838d96fe5c',
        sourceCreatedAt: expect.any(Date),
        sourceUpdatedAt: expect.any(Date),
      },
      {
        individualHooks: true,
        returning: true,
        plain: true,
      },
    );
    expect(result.inserts).toHaveLength(1);
  });

  it('should process a record and add it to updates if it exists', async () => {
    const mockRecord = {
      reviewId: '45c95636-bc62-11ee-9813-837372b0ff39',
      findingHistoryId: '4791bc9c-bc62-11ee-9530-fb12cdb651b3',
    };
    mockXmlClient.getNextObject.mockResolvedValueOnce(mockRecord);

    mockFindOne.mockImplementation(() => new Promise((resolve, reject) => {
      resolve({
        id: 1,
        reviewId: '45c95636-bc62-11ee-9813-837372b0ff39',
        findingHistoryId: '4791bc9c-bc62-11ee-9530-fb12cdb651b3',
        hash: 'a27c9d4ce22e472c6ab7e08374d6789069dcf2fedbbc4e10392661838d96fe51',
      });
    }));

    mockUpdate.mockResolvedValue({ id: 1 });

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
    });

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions);

    expect(mockUpdate).toHaveBeenCalledWith(
      {
        hash: 'a27c9d4ce22e472c6ab7e08374d6789069dcf2fedbbc4e10392661838d96fe5c',
        sourceUpdatedAt: expect.any(Date),
      },
      {
        individualHooks: true,
        returning: true,
        plain: true,
        where: {
          id: 1,
        },
      },
    );
    expect(result.updates).toHaveLength(1);
  });

  it('should handle errors and add them to the errors array - getNextObject', async () => {
    const mockError = new Error('Test Error');
    mockXmlClient.getNextObject.mockImplementation(() => {
      throw mockError;
    });

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toBe(mockError.message);
  });

  it('should handle errors and add them to the errors array - modelForTable - not found', async () => {
    const mockRecord = {
      reviewId: '45c95636-bc62-11ee-9813-837372b0ff39',
      findingHistoryId: '4791bc9c-bc62-11ee-9530-fb12cdb651b3',
    };
    mockXmlClient.getNextObject.mockResolvedValueOnce(mockRecord);

    modelForTable.mockImplementation(() => {
      // eslint-disable-next-line @typescript-eslint/quotes
      throw new Error(`Unable to find table for 'MonitoringFindingHistories'`);
    });

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions);

    expect(result.errors).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/quotes
    expect(result.errors[0]).toBe(`Unable to find table for 'MonitoringFindingHistories'`);
  });

  it('should process deletion of records not present in the file', async () => {
    mockGetNextObject.mockResolvedValue(null); // Simulate end of XML stream

    const mockDestroy = jest.fn().mockResolvedValue({ id: 3 });
    mockModelForTable.mockReturnValue({
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: mockDestroy,
    });

    recordActions.updates.push({ id: 1 });
    recordActions.updates.push({ id: 2 });

    recordActions.inserts.push({ id: 4 });
    recordActions.inserts.push({ id: 5 });

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions);

    expect(mockDestroy).toHaveBeenCalledWith({});
    expect(result.deletes).toHaveLength(1);
  });

// ... Add more tests to cover different branches and scenarios
});
