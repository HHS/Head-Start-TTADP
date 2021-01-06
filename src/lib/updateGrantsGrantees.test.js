import updateGrantsGrantees from './updateGrantsGrantees';
import db, {
  Grantee, Grant,
} from '../models';

describe('Update grants and grantees', () => {
  afterAll(() => {
    db.sequelize.close();
  });
  it('should import or update grantees', async () => {
    await Grant.destroy({ where: {} });
    await Grantee.destroy({ where: {} });
    const granteesBefore = await Grantee.findAll();

    expect(granteesBefore.length).toBe(0);
    await updateGrantsGrantees();

    const grantee = await Grantee.findOne({ where: { id: 1335 } });
    expect(grantee).toBeDefined();
    expect(grantee.name).toBe('Greater Bergen Community Action, Inc.');
  });

  it('should import or update grants', async () => {
    await Grant.destroy({ where: {} });
    await Grantee.destroy({ where: {} });
    const grantsBefore = await Grantee.findAll();

    expect(grantsBefore.length).toBe(0);
    await updateGrantsGrantees();

    const grants = await Grant.findAll({ where: { granteeId: 1335 } });
    expect(grants).toBeDefined();
    expect(grants.length).toBe(3);
    const containsNumber = grants.some((g) => g.number === '02CH010840');
    expect(containsNumber).toBeTruthy();
  });
});
