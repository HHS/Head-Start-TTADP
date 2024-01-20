const { IMPORT_STATUSES } = require('../constants');
const { prepMigration, removeTables } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable('Imports', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        ftpSettings: {
          allowNull: false,
          type: Sequelize.JSONB,
        },
        path: {
          allowNull: true,
          type: Sequelize.TEXT,
        },
        fileMask: {
          allowNull: true,
          type: Sequelize.TEXT,
        },
        schedule: {
          allowNull: false,
          type: Sequelize.TEXT,
        },
        enabled: {
          allowNull: false,
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        definitions: {
          type: Sequelize.JSONB,
          allowNull: false,
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

      await queryInterface.createTable('ImportFiles', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        importId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Imports',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        fileId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'Files',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        ftpFileInfo: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        status: {
          type: Sequelize.ENUM(Object.values(IMPORT_STATUSES)),
          allowNull: false,
          defaultValue: IMPORT_STATUSES.IDENTIFIED,
        },
        downloadAttempts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        processAttempts: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
        },
        hash: {
          type: Sequelize.TEXT,
          allowNull: true,
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

      await queryInterface.sequelize.query(`
          CREATE UNIQUE INDEX "ImportFiles_importId_fileId"
          ON "ImportFiles"
          ("importId", "fileId");
      `, { transaction });
      // https://github.com/sequelize/sequelize/issues/9934
      await queryInterface.sequelize.query(`
          ALTER TABLE "ImportFiles"
          ADD CONSTRAINT "ImportFiles_importId_fileId_unique"
          UNIQUE USING INDEX "ImportFiles_importId_fileId";
      `, { transaction });

      await queryInterface.createTable('ImportDataFiles', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        importFileId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ImportFiles',
            },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        fileInfo: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        processed: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        hash: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        schema: {
          type: Sequelize.JSONB,
          allowNull: true,
        },
        recordCounts: {
          type: Sequelize.JSONB,
          allowNull: true,
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

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await removeTables(queryInterface, transaction, [
        'Imports',
        'ImportFiles',
        'ImportDataFiles',
      ]);
    });
  },
};
