import Semaphore from '../../lib/semaphore';

import {
  syncLink,
  syncGrantNumberLink,
  syncMonitoringReviewLink,
  syncMonitoringReviewStatusLink,
} from './genericLink';

describe('syncLink', () => {
  const sequelize = {};
  const instance = {};
  instance.changed = jest.fn().mockReturnValue(['sourceEntity']);
  const options = { transactions: {} };
  const model = {};
  const sourceEntityName = 'sourceEntity';
  const targetEntityName = 'targetEntity';

  const entityId = 'entityId';
  const onCreateCallbackWhileHoldingLock = jest.fn().mockResolvedValue(true);
  const acquireMock = jest.spyOn(Semaphore.prototype, 'acquire');
  const releaseMock = jest.spyOn(Semaphore.prototype, 'release');
  acquireMock.mockImplementation(() => {});
  releaseMock.mockImplementation(() => {});

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should acquire and release a semaphore lock', async () => {
    model.findAll = jest.fn().mockResolvedValueOnce([{}]);

    await syncLink(
      sequelize,
      instance,
      options,
      model,
      sourceEntityName,
      targetEntityName,
      entityId,
      onCreateCallbackWhileHoldingLock,
    );

    expect(acquireMock).toHaveBeenCalledWith(`${model.tableName}_${entityId}`);
    expect(releaseMock).toHaveBeenCalledWith(`${model.tableName}_${entityId}`);
  });

  it('should create a new record if one does not exist', async () => {
    model.findAll = jest.fn().mockResolvedValueOnce([null]);
    model.create = jest.fn().mockResolvedValueOnce([{}]);

    await syncLink(
      sequelize,
      instance,
      options,
      model,
      sourceEntityName,
      targetEntityName,
      entityId,
      onCreateCallbackWhileHoldingLock,
    );

    expect(model.create).toHaveBeenCalledWith(
      { [targetEntityName]: entityId },
      { transaction: options.transactions },
    );
  });

  it('should call onCreateCallbackWhileHoldingLock if a new record is created', async () => {
    model.findAll = jest.fn().mockResolvedValueOnce([null]);
    model.create = jest.fn().mockResolvedValueOnce([{}]);

    await syncLink(
      sequelize,
      instance,
      options,
      model,
      sourceEntityName,
      targetEntityName,
      entityId,
      onCreateCallbackWhileHoldingLock,
    );

    expect(onCreateCallbackWhileHoldingLock).toHaveBeenCalledWith(
      sequelize,
      instance,
      options,
      model,
      targetEntityName,
      entityId,
    );
  });

  it('should not create a new record if one exists', async () => {
    model.findAll = jest.fn().mockResolvedValueOnce([{}]);
    model.create = jest.fn().mockResolvedValueOnce([{}]);

    await syncLink(
      sequelize,
      instance,
      options,
      model,
      sourceEntityName,
      targetEntityName,
      entityId,
      onCreateCallbackWhileHoldingLock,
    );

    expect(model.create).not.toHaveBeenCalled();
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
