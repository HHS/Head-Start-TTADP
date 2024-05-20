const { SUPPORT_TYPES } = require('@ttahub/common');
const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.removeColumn('Objectives', 'supportType', { transaction });
      await queryInterface.dropTable('ZALObjectiveTemplateTopics', { transaction });
      await queryInterface.dropTable('ZALObjectiveTemplateFiles', { transaction });
      await queryInterface.dropTable('ZALObjectiveTemplateResources', { transaction });
      await queryInterface.dropTable('ZALObjectiveCourses', { transaction });
      await queryInterface.dropTable('ZALObjectiveTopics', { transaction });
      await queryInterface.dropTable('ZALObjectiveFiles', { transaction });
      await queryInterface.dropTable('ZALObjectiveResources', { transaction });
      await queryInterface.dropTable('ObjectiveTemplateTopics', { transaction });
      await queryInterface.dropTable('ObjectiveTemplateFiles', { transaction });
      await queryInterface.dropTable('ObjectiveTemplateResources', { transaction });
      await queryInterface.dropTable('ObjectiveCourses', { transaction });
      await queryInterface.dropTable('ObjectiveTopics', { transaction });
      await queryInterface.dropTable('ObjectiveFiles', { transaction });
      await queryInterface.dropTable('ObjectiveResources', { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction, Sequelize) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.addColumn('Objectives', 'supportType', {
        type: Sequelize.ENUM(SUPPORT_TYPES),
        allowNull: true,
      }, { transaction });

      await queryInterface.createTable('ObjectiveTemplateTopics', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectiveTemplateId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        topicId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Topics',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveTemplateFiles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectiveTemplateId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
        },
        fileId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'Files',
            },
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveTemplateResources', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        userProvidedUrl: {
          type: Sequelize.STRING,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        objectiveTemplateId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveCourses', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectiveId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Objectives',
            },
            key: 'id',
          },
        },
        courseId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Courses',
            },
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW'),
        },
      }, {
        transaction,
      });
      await queryInterface.createTable('ObjectiveTopics', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectiveId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Objectives',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        topicId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Topics',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveFiles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        objectiveId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'Objectives',
            },
            key: 'id',
          },
        },
        fileId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'Files',
            },
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('ObjectiveResources', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        userProvidedUrl: {
          type: Sequelize.STRING,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        objectiveId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Objectives',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      }, { transaction });
    });
  },
};
