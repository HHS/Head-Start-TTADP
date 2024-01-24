// processRecords.test.ts
import { processRecords } from '../process';
import XMLStream from '../../stream/xml';
import db from '../../../models';

// Mock the external modules
jest.mock('../../stream/xml');
jest.mock('../../../models');

// Mock the db and modelForTable function
const mockModelForTable = jest.fn();
jest.mock('../../modelUtils', () => ({
  modelForTable: (...args) => mockModelForTable(...args),
}));

describe('processRecords', () => {
  const mockXmlClient = new XMLStream(true);
  const mockGetNextObject = jest.fn();
  mockXmlClient.getNextObject = mockGetNextObject;

  const processDefinition = {
    fileName: 'test.xml',
    encoding: 'utf-8',
    tableName: 'TestTable',
    keys: ['id'],
    remapDef: { oldKey: 'newKey' },
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
    const mockRecord = { id: 1, oldKey: 'value' };
    mockGetNextObject.mockResolvedValue(mockRecord);

    const mockCreate = jest.fn().mockResolvedValue({ id: 1 });
    mockModelForTable.mockReturnValue({
      findOne: jest.fn().mockResolvedValue(null),
      create: mockCreate,
      update: jest.fn(),
      destroy: jest.fn(),
    });

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions);

    expect(mockCreate).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    expect(result.inserts).toHaveLength(1);
  });

  it('should process a record and add it to updates if it exists', async () => {
    const mockRecord = { id: 1, oldKey: 'value' };
    mockGetNextObject.mockResolvedValue(mockRecord);

    const mockUpdate = jest.fn().mockResolvedValue({ id: 1 });
    mockModelForTable.mockReturnValue({
      findOne: jest.fn().mockResolvedValue({ id: 1 }),
      create: jest.fn(),
      update: mockUpdate,
      destroy: jest.fn(),
    });

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions);

    expect(mockUpdate).toHaveBeenCalledWith(expect.any(Object), expect.any(Object));
    expect(result.updates).toHaveLength(1);
  });

  it('should handle errors and add them to the errors array', async () => {
    const mockError = new Error('Test Error');
    mockGetNextObject.mockRejectedValue(mockError);

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions);

    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toBe(mockError.message);
  });

  it('should process deletion of records not present in the file', async () => {
    mockGetNextObject.mockResolvedValue(null); // Simulate end of XML stream

    const mockDestroy = jest.fn().mockResolvedValue({ id: 1 });
    mockModelForTable.mockReturnValue({
      findOne: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      destroy: mockDestroy,
    });

    const result = await processRecords(processDefinition, mockXmlClient, fileDate, recordActions);

    expect(mockDestroy).toHaveBeenCalled();
    expect(result.deletes).toHaveLength(1);
  });

// ... Add more tests to cover different branches and scenarios
});
