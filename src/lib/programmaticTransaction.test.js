import * as transactionModule from './programmaticTransaction';
import {
  Grant,
  Topic,
  sequelize,
} from '../models';
import { auditLogger } from '../logger';

describe('Programmatic Transaction', () => {
  it('Insert', async () => {
    const snapshot = await transactionModule.captureSnapshot();
    await Topic.create({
      name: 'Test Topic',
    });
    let topic = await Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).not.toBeNull();
    await transactionModule.rollbackToSnapshot(snapshot);
    topic = await Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).toBeNull();
  });
  it('Update', async () => {
    const snapshot = await transactionModule.captureSnapshot();
    const grant = await Grant.findOne({
      where: { status: 'Active' },
      order: [['id', 'ASC']],
      limit: 1,
    });
    await grant.update({ status: 'Inactive' });
    await grant.reload();
    expect(grant.status).toBe('Inactive');
    await transactionModule.rollbackToSnapshot(snapshot);
    await grant.reload();
    expect(grant.status).toBe('Active');
  });
  it('Delete', async () => {
    await Topic.create({
      name: 'Test Topic',
    });
    const snapshot = await transactionModule.captureSnapshot();
    await Topic.destroy({ where: { name: 'Test Topic' }, force: true });
    let topic = await Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).toBeNull();
    await transactionModule.rollbackToSnapshot(snapshot);
    topic = Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).not.toBeNull();
    await Topic.destroy({ where: { name: 'Test Topic' }, force: true });
  });
  it('should sort changes by timestamp in descending order', async () => {
    const snapshot = await transactionModule.captureSnapshot();
    // Simulate multiple changes with different timestamps
    await Topic.create({ name: 'Topic A' });
    // Delay to ensure different timestamps
    // eslint-disable-next-line no-promise-executor-return
    await new Promise((resolve) => setTimeout(resolve, 1000));
    await Topic.create({ name: 'Topic B' });
    const changes = await transactionModule.fetchAndAggregateChanges(snapshot);
    expect(changes[0].new_row_data.name).toBe('Topic B');
    expect(changes[1].new_row_data.name).toBe('Topic A');
    await transactionModule.rollbackToSnapshot(snapshot);
  });
  it('should throw error for unknown dml_type', async () => {
    const snapshot = await transactionModule.captureSnapshot();
    const maxIds = await transactionModule.fetchMaxIds();
    const fakeChange = {
      source_table: 'Topic',
      dml_type: 'INVALID_TYPE',
      old_row_data: { id: 1 },
      new_row_data: { id: 1 },
      dml_timestamp: new Date().toISOString(),
      data_id: 1,
    };

    // Spy and mock the implementation of fetchAndAggregateChanges
    const spy = jest.spyOn(transactionModule, 'fetchAndAggregateChanges')
      .mockResolvedValue([fakeChange]);

    await expect(transactionModule.revertChange([fakeChange]))
      .rejects
      .toThrow('Unknown dml_type(INVALID_TYPE) for table: Topic');

    // Restore the original function
    spy.mockRestore(); // This restores the original implementation
  });
  it('should log and rethrow the error during reversion of changes', async () => {
    jest.spyOn(auditLogger, 'error'); // Spy on auditLogger.error if not already done

    const snapshot = await transactionModule.captureSnapshot();
    const maxIds = await transactionModule.fetchMaxIds();

    // Spy on sequelize.query and force it to throw an error
    const querySpy = jest.spyOn(sequelize, 'query').mockImplementationOnce(() => {
      throw new Error('Database error');
    });

    await expect(transactionModule.revertAllChanges(maxIds))
      .rejects
      .toThrow('Database error');

    // Check if the error log was called correctly
    expect(auditLogger.error).toHaveBeenCalledWith(
      'Error during reversion:',
      expect.any(Error),
    );

    // Restore the spy
    querySpy.mockRestore();
    auditLogger.error.mockRestore();
  });
});
