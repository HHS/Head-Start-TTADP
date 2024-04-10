const { AUTOMATIC_CREATION, CURATED_CREATION } = require('../constants');
const { propagateDestroyToTemplate } = require('./objectiveTemplateFile');

describe('propagateDestroyToTemplate', () => {
  it('should do nothing if not automatic creation', async () => {
    const sequelize = {}; // Mock sequelize object
    const instance = {
      objectiveId: 1,
      fileId: 1,
    };
    const options = {
      transaction: {},
    };

    // Mock Objective.findOne method
    sequelize.models = {
      Objective: {
        findOne: jest.fn().mockResolvedValue({
          objectiveTemplate: {
            creationMethod: CURATED_CREATION,
          },
        }),
      },
      ObjectiveTemplateFile: {
        findOne: jest.fn(),
        update: jest.fn(),
        destroy: jest.fn(),
      },
    };

    await propagateDestroyToTemplate(sequelize, instance, options);

    expect(sequelize.models.Objective.findOne).toHaveBeenCalledWith({
      where: { id: instance.objectiveId },
      include: [
        {
          model: sequelize.models.ObjectiveTemplate,
          as: 'objectiveTemplate',
          required: true,
          attributes: ['id', 'creationMethod'],
        },
      ],
      transaction: options.transaction,
    });

    expect(sequelize.models.ObjectiveTemplateFile.findOne).not.toHaveBeenCalled();
    expect(sequelize.models.ObjectiveTemplateFile.update).not.toHaveBeenCalled();
    expect(sequelize.models.ObjectiveTemplateFile.destroy).not.toHaveBeenCalled();
  });

  it('should update the updatedAt field of ObjectiveTemplateFile if there are objectives on approved reports', async () => {
    const sequelize = {}; // Mock sequelize object
    const instance = {
      objectiveId: 1,
      fileId: 1,
    };
    const options = {
      transaction: {},
    };

    // Mock Objective.findOne method
    sequelize.models = {
      Objective: {
        findOne: jest.fn().mockResolvedValue({
          objectiveTemplate: {
            creationMethod: AUTOMATIC_CREATION,
          },
        }),
      },
      ObjectiveTemplateFile: {
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          objectiveTemplate: {
            objectives: [{ id: 1 }],
            creationMethod: AUTOMATIC_CREATION,
          },
        }),
        update: jest.fn(),
      },
    };

    await propagateDestroyToTemplate(sequelize, instance, options);

    expect(sequelize.models.Objective.findOne).toHaveBeenCalledWith({
      where: { id: instance.objectiveId },
      include: [
        {
          model: sequelize.models.ObjectiveTemplate,
          as: 'objectiveTemplate',
          required: true,
          attributes: ['id', 'creationMethod'],
        },
      ],
      transaction: options.transaction,
    });

    expect(sequelize.models.ObjectiveTemplateFile.findOne).toHaveBeenCalledWith({
      attributes: ['id'],
      where: {
        objectiveTemplateId: instance.objectiveTemplateId,
        fileId: instance.fileId,
      },
      include: [
        {
          model: sequelize.models.ObjectiveTemplate,
          as: 'objectiveTemplate',
          required: true,
          include: [
            {
              model: sequelize.models.Objective,
              as: 'objectives',
              required: true,
              attributes: ['id'],
              where: { onApprovedAR: true },
            },
          ],
        },
      ],
      transaction: options.transaction,
    });

    expect(sequelize.models.ObjectiveTemplateFile.update).toHaveBeenCalledWith(
      {
        updatedAt: expect.any(Date),
      },
      {
        where: { id: expect.any(Number) },
        transaction: options.transaction,
        individualHooks: true,
      },
    );
  });

  it('should destroy ObjectiveTemplateFile if there are no objectives on approved reports', async () => {
    const sequelize = {}; // Mock sequelize object
    const instance = {
      objectiveId: 1,
      fileId: 1,
    };
    const options = {
      transaction: {},
    };

    // Mock Objective.findOne method
    sequelize.models = {
      Objective: {
        findOne: jest.fn().mockResolvedValue({
          objectiveTemplate: {
            creationMethod: AUTOMATIC_CREATION,
          },
        }),
      },
      ObjectiveTemplateFile: {
        findOne: jest.fn().mockResolvedValue({
          id: 1,
          objectiveTemplate: {
            objectives: [],
          },
        }),
        destroy: jest.fn(),
      },
    };

    await propagateDestroyToTemplate(sequelize, instance, options);

    expect(sequelize.models.Objective.findOne).toHaveBeenCalledWith({
      where: { id: instance.objectiveId },
      include: [
        {
          model: sequelize.models.ObjectiveTemplate,
          as: 'objectiveTemplate',
          required: true,
          attributes: ['id', 'creationMethod'],
        },
      ],
      transaction: options.transaction,
    });

    expect(sequelize.models.ObjectiveTemplateFile.findOne).toHaveBeenCalledWith({
      attributes: ['id'],
      where: {
        objectiveTemplateId: instance.objectiveTemplateId,
        fileId: instance.fileId,
      },
      include: [
        {
          model: sequelize.models.ObjectiveTemplate,
          as: 'objectiveTemplate',
          required: true,
          include: [
            {
              model: sequelize.models.Objective,
              as: 'objectives',
              required: true,
              attributes: ['id'],
              where: { onApprovedAR: true },
            },
          ],
        },
      ],
      transaction: options.transaction,
    });

    expect(sequelize.models.ObjectiveTemplateFile.destroy).toHaveBeenCalledWith(
      {
        where: { id: expect.any(Number) },
        individualHooks: true,
        transaction: options.transaction,
      },
    );
  });
});
