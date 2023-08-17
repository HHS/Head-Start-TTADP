import { Op, Sequelize } from 'sequelize';
import {
  autoPopulateIsFlagged,
  findFlaggedModelsFromModel,
  setModelAttributesAsFlagged,
} from '../isFlagged';
import {
  Report,
  ReportObjective,
  ReportObjectiveFile,
  ReportObjectiveResource,
  ReportObjectiveTopic,
  Objective,
  ObjectiveFile,
  ObjectiveResource,
  ObjectiveTopic,
} from '../..';

describe('autoPopulateIsFlagged', () => {
  let instance;
  let options;

  beforeEach(() => {
    instance = {
      // eslint-disable-next-line object-shorthand,func-names
      set: function (name, value) { this[name] = value; },
    };
    options = { fields: [] };
  });

  it('should set flagName to false if it is undefined', () => {
    const flagName = 'isFlagged';

    autoPopulateIsFlagged(flagName, null, instance, options);

    expect(instance[flagName]).toBe(false);
  });

  it('should set flagName to false if it is null', () => {
    const flagName = 'isFlagged';

    autoPopulateIsFlagged(flagName, null, instance, options);

    expect(instance[flagName]).toBe(false);
  });

  it('should add flagName to the fields array if it is not included', () => {
    const flagName = 'isFlagged';

    autoPopulateIsFlagged(flagName, null, instance, options);

    expect(options.fields).toContain(flagName);
  });

  it('should not add flagName to the fields array if it is already included', () => {
    const flagName = 'isFlagged';
    options.fields.push(flagName);

    autoPopulateIsFlagged(flagName, null, instance, options);

    expect(options.fields.length).toBe(1);
  });
});

describe('findFlaggedModelsFromModel', () => {
  let model;

  beforeAll(() => {
    model = {
      name: 'Report',
      tableName: 'Reports',
      associations: {
        reportGoals: {
          target: {
            name: 'ReportGoal',
            tableName: 'ReportGoals',
            rawAttributes: {
              flag1: true,
            },
            associations: {
              goals: {
                target: {
                  name: 'Goal',
                  tableName: 'Goals',
                  rawAttributes: {
                    flag1: true,
                  },
                },
                as: 'goals',
              },
            },
          },
          as: 'reportGoals',
        },
        association2: {
          target: {
            name: 'target2',
            tableName: 'target2',
            rawAttributes: {
              flag2: true,
            },
          },
          as: 'association2',
        },
        association3: {
          target: {
            name: 'prefixTarget1',
            tableName: 'prefixTarget1',
            rawAttributes: {
              flag3: true,
            },
          },
          as: 'association3',
        },
        association4: {
          target: {
            name: 'prefixTarget2',
            tableName: 'prefixTarget2',
            rawAttributes: {
              flag4: true,
            },
          },
          as: 'association4',
        },
        association5: {
          target: {
            name: 'prefixTarget3',
            tableName: 'prefixTarget3',
            rawAttributes: {
              flag5: true,
            },
          },
          as: 'association5',
        },
      },
    };
  });

  it('should add includes and aggregates for flagged models without prefix', () => {
    const flagName = 'isFoiaable';
    const prefix = 'reportObjective';

    const result = findFlaggedModelsFromModel(
      flagName,
      ReportObjective,
      prefix,
    );

    console.log(result.includes, result.aggregates, result.aggregateObjects);

    expect(result.includes).toEqual([
      {
        model: Objective,
        as: 'objective',
        attributes: [],
        required: false,
      },
      {
        model: ReportObjectiveFile,
        as: 'reportObjectiveFiles',
        attributes: [],
        required: false,
        includes: [{
          as: 'objectiveFile',
          attributes: [],
          model: ObjectiveFile,
          required: false,
        }],
      },
      {
        model: ReportObjectiveResource,
        as: 'reportObjectiveResources',
        attributes: [],
        required: false,
        includes: [{
          as: 'objectiveResource',
          attributes: [],
          model: ObjectiveResource,
          required: false,
        }],
      },
      {
        model: ReportObjectiveTopic,
        as: 'reportObjectiveTopics',
        attributes: [],
        required: false,
        includes: [{
          as: 'objectiveTopic',
          attributes: [],
          model: ObjectiveTopic,
          required: false,
        }],
      },
    ]);
    expect(result.aggregates).toEqual([
      [
        Sequelize.literal('ARRAY_AGG(DISTINCT "Objectives"."id")'),
        'ObjectivesIds',
      ],
      [
        Sequelize.literal('ARRAY_AGG(DISTINCT "ObjectiveFiles"."id")'),
        'ObjectiveFilesIds',
      ],
      [
        Sequelize.literal('ARRAY_AGG(DISTINCT "ObjectiveResources"."id")'),
        'ObjectiveResourcesIds',
      ],
      [
        Sequelize.literal('ARRAY_AGG(DISTINCT "ObjectiveTopics"."id")'),
        'ObjectiveTopicsIds',
      ],
    ]);
    expect(result.aggregateObjects).toEqual([
      { model: Objective, aggregateName: 'ObjectivesIds' },
      { model: ObjectiveFile, aggregateName: 'ObjectiveFilesIds' },
      { model: ObjectiveResource, aggregateName: 'ObjectiveResourcesIds' },
      { model: ObjectiveTopic, aggregateName: 'ObjectiveTopicsIds' },
    ]);
  });

  it('should not add includes and aggregates for flagged models with prefix', () => {
    const flagName = 'flag3';
    const prefix = 'prefix';
    const includes = [];
    const aggregates = [];
    const aggregateObjects = [];

    const result = findFlaggedModelsFromModel(
      flagName,
      model,
      prefix,
      includes,
      aggregates,
      aggregateObjects,
    );

    expect(result.includes).toEqual([]);
    expect(result.aggregates).toEqual([]);
    expect(result.aggregateObjects).toEqual([]);
  });
});

describe('setModelAttributesAsFlagged', () => {
  it('should update aggregate models with isFoiaable set to true', async () => {
    // Arrange
    const flagName = 'isFoiaable';
    const model = {
      findAll: jest.fn().mockResolvedValue([{ id: 1, aggregate1: 2, aggregate2: 3 }]),
    };
    const prefix = 'reportObjective';
    const options = { transaction: {} };
    const modelId = 1;
    const aggregateObjects = [
      { aggregateModel: { update: jest.fn() }, aggregateName: 'aggregate1' },
      { aggregateModel: { update: jest.fn() }, aggregateName: 'aggregate2' },
    ];

    // Act
    await setModelAttributesAsFlagged(flagName, ReportObjective, prefix, options, modelId);

    // Assert
    expect(model.findAll).toHaveBeenCalledWith({
      attributes: [['id', 'prefixId'], 'aggregate1', 'aggregate2'],
      where: { id: modelId },
      includes: undefined,
      group: ['id'],
      raw: true,
      transaction: options.transaction,
    });

    expect(aggregateObjects[0].aggregateModel.update).toHaveBeenCalledWith(
      { isFoiaable: true },
      { where: { id: 2 }, transaction: options.transaction, individualHooks: true },
    );

    expect(aggregateObjects[1].aggregateModel.update).toHaveBeenCalledWith(
      { isFoiaable: true },
      { where: { id: 3 }, transaction: options.transaction, individualHooks: true },
    );
  });
});
