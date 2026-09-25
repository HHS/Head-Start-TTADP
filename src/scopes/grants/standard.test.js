import { GoalTemplate } from '../../models';
import { createGrant, createRecipient } from '../../testUtils';
import filtersToScopes from '../index';
import { Goal, Grant, Op, sequelize } from './testHelpers';

describe('grants/standard', () => {
  let recipientWithFEI;
  let recipientWithERSEA;
  let recipientSpanningRegions;
  let feiGrant;
  let secondGrantForFEIRecipient;
  let erseaGrant;
  let regionOneGrantWithFEI;
  let regionTwoGrantWithoutFEI;
  let goalFEI;
  let goalERSEA;
  let goalFEIForRegionOne;

  beforeAll(async () => {
    const [templateFEI, templateERSEA] = await Promise.all([
      GoalTemplate.findOne({ where: { standard: 'FEI' } }),
      GoalTemplate.findOne({ where: { standard: 'ERSEA' } }),
    ]);

    recipientWithFEI = await createRecipient();
    recipientWithERSEA = await createRecipient();
    recipientSpanningRegions = await createRecipient();
    feiGrant = await createGrant({ recipientId: recipientWithFEI.id });
    secondGrantForFEIRecipient = await createGrant({ recipientId: recipientWithFEI.id });
    erseaGrant = await createGrant({ recipientId: recipientWithERSEA.id });
    regionOneGrantWithFEI = await createGrant({
      recipientId: recipientSpanningRegions.id,
      regionId: 1,
    });
    regionTwoGrantWithoutFEI = await createGrant({
      recipientId: recipientSpanningRegions.id,
      regionId: 2,
    });

    goalFEI = await Goal.create({
      name: 'FEI goal for grant standard filter',
      status: 'Not Started',
      timeframe: '12 months',
      grantId: feiGrant.id,
      goalTemplateId: templateFEI.id,
      createdVia: 'rtr',
    });

    goalERSEA = await Goal.create({
      name: 'ERSEA goal for grant standard filter',
      status: 'Not Started',
      timeframe: '12 months',
      grantId: erseaGrant.id,
      goalTemplateId: templateERSEA.id,
      createdVia: 'rtr',
    });

    goalFEIForRegionOne = await Goal.create({
      name: 'FEI goal for region one grant of multi-region recipient',
      status: 'Not Started',
      timeframe: '12 months',
      grantId: regionOneGrantWithFEI.id,
      goalTemplateId: templateFEI.id,
      createdVia: 'rtr',
    });
  });

  afterAll(async () => {
    await Goal.destroy({
      where: { id: [goalFEI.id, goalERSEA.id, goalFEIForRegionOne.id] },
      force: true,
      individualHooks: true,
    });
    await Grant.destroy({
      where: {
        id: [
          feiGrant.id,
          secondGrantForFEIRecipient.id,
          erseaGrant.id,
          regionOneGrantWithFEI.id,
          regionTwoGrantWithoutFEI.id,
        ],
      },
      force: true,
      individualHooks: true,
    });
    await recipientWithFEI.destroy({ force: true });
    await recipientWithERSEA.destroy({ force: true });
    await recipientSpanningRegions.destroy({ force: true });
    await sequelize.close();
  });

  it('filters grants by included goal standard', async () => {
    const { grant: scope } = await filtersToScopes({ 'standard.in': ['FEI'] });
    const found = await Grant.findAll({
      where: {
        [Op.and]: [
          scope.where,
          { id: [feiGrant.id, secondGrantForFEIRecipient.id, erseaGrant.id] },
        ],
      },
    });

    expect(found.map((grant) => grant.id).sort()).toEqual(
      [feiGrant.id, secondGrantForFEIRecipient.id].sort()
    );
  });

  it('filters every grant for a recipient out by excluded goal standard', async () => {
    const { grant: scope } = await filtersToScopes({ 'standard.nin': ['FEI'] });
    const found = await Grant.findAll({
      where: {
        [Op.and]: [
          scope.where,
          { id: [feiGrant.id, secondGrantForFEIRecipient.id, erseaGrant.id] },
        ],
      },
    });

    expect(found.map((grant) => grant.id)).toEqual([erseaGrant.id]);
  });

  it("does not leak a matching standard across a recipient's other regions", async () => {
    const { grant: scope } = await filtersToScopes({ 'standard.in': ['FEI'] });
    const found = await Grant.findAll({
      where: {
        [Op.and]: [scope.where, { id: [regionOneGrantWithFEI.id, regionTwoGrantWithoutFEI.id] }],
      },
    });

    expect(found.map((grant) => grant.id)).toEqual([regionOneGrantWithFEI.id]);
  });
});
