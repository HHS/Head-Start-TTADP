import { Sequelize } from 'sequelize';
import Semaphore from '../../lib/semaphore';
import {
  syncLink,
  syncGrantNumberLink,
  syncMonitoringReviewLink,
  syncMonitoringReviewStatusLink,
} from './genericLink';

// Mock the Semaphore and Sequelize models
jest.mock('../../lib/semaphore', () => jest.fn().mockImplementation(() => ({
  acquire: jest.fn().mockResolvedValue(true),
  release: jest.fn().mockResolvedValue(true),
})));

const mockFindOne = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('sequelize', () => {
  const actualSequelize = jest.requireActual('sequelize');
  return {
    ...actualSequelize,
    Model: {
      findOne: mockFindOne,
      create: mockCreate,
      update: mockUpdate,
    },
  };
});

describe('syncLink', () => {
  const sequelize = new Sequelize();
  const instance = {};
  const options = { transactions: {} };
  const model = sequelize.define('Model', {});
  const entityName = 'entityName';
  const entityId = 'entityId';
  const onCreateCallbackWhileHoldingLock = jest.fn().mockResolvedValue(true);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should acquire and release a semaphore lock', async () => {
    const semaphore = new Semaphore(1);
    mockFindOne.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({});

    await syncLink(
      sequelize,
      instance,
      options,
      model,
      entityName,
      entityId,
      onCreateCallbackWhileHoldingLock,
    );

    expect(semaphore.acquire).toHaveBeenCalledWith(`${model.modelName}_${entityId}`);
    expect(semaphore.release).toHaveBeenCalledWith(`${model.modelName}_${entityId}`);
  });

  it('should create a new record if one does not exist', async () => {
    mockFindOne.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({});

    await syncLink(
      sequelize,
      instance,
      options,
      model,
      entityName,
      entityId,
      onCreateCallbackWhileHoldingLock,
    );

    expect(mockCreate).toHaveBeenCalledWith(
      { [entityName]: entityId },
      { transaction: options.transactions },
    );
  });

  it('should call onCreateCallbackWhileHoldingLock if a new record is created', async () => {
    mockFindOne.mockResolvedValueOnce(null);
    mockCreate.mockResolvedValueOnce({});

    await syncLink(
      sequelize,
      instance,
      options,
      model,
      entityName,
      entityId,
      onCreateCallbackWhileHoldingLock,
    );

    expect(onCreateCallbackWhileHoldingLock).toHaveBeenCalledWith(
      sequelize,
      instance,
      options,
      model,
      entityName,
      entityId,
    );
  });

  it('should not create a new record if one exists', async () => {
    mockFindOne.mockResolvedValueOnce({});

    await syncLink(
      sequelize,
      instance,
      options,
      model,
      entityName,
      entityId,
      onCreateCallbackWhileHoldingLock,
    );

    expect(mockCreate).not.toHaveBeenCalled();
  });

  // Add more tests to cover error handling, different scenarios, etc.
});

describe('syncGrantNumberLink', () => {
  // Add tests for syncGrantNumberLink
});

describe('syncMonitoringReviewLink', () => {
  // Add tests for syncMonitoringReviewLink
});

describe('syncMonitoringReviewStatusLink', () => {
  // Add tests for syncMonitoringReviewStatusLink
});

// Note: The above tests are basic and should be expanded to cover more scenarios,
// including error handling and edge cases.
