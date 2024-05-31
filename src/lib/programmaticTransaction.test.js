import {
  captureSnapshot,
  rollbackToSnapshot,
} from 'programmaticTransaction';

import {
  Grant,
  Topic,
  sequelize,
} from '../models';

describe('Programmatic Transaction', () => {
  it('Insert', async () => {
    const snapshot = await captureSnapshot();
    await Topic.create({
      name: 'Test Topic',
    });
    let topic = await Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).not.toBeNull();
    await rollbackToSnapshot(snapshot);
    topic = await Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).toBeNull();
  });
  it('Update', async () => {
    const snapshot = await captureSnapshot();
    const grant = await Grant.findOne({
      where: { status: 'Active' },
      order: [['id', 'ASC']],
      limit: 1,
    });
    await grant.update({ status: 'Inactive' });
    await grant.reload();
    expect(grant.status).toBe('Inactive');
    await rollbackToSnapshot(snapshot);
    await grant.reload();
    expect(grant.status).toBe('Active');
  });
  it('Delete', async () => {
    await Topic.create({
      name: 'Test Topic',
    });
    const snapshot = await captureSnapshot();
    await Topic.destroy({ where: { name: 'Test Topic' }, force: true });
    let topic = Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).toBeNull();
    await rollbackToSnapshot(snapshot);
    topic = Topic.findOne({ where: { name: 'Test Topic' } });
    expect(topic).not.toBeNull();
    await Topic.destroy({ where: { name: 'Test Topic' }, force: true });
  });
});
