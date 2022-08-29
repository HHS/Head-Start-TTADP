/* eslint-disable no-empty-function */

/**
 * update roles table based on info provided in this Jira
 * https://ocio-jira.acf.hhs.gov/browse/TTAHUB-948
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (transaction) => {
      // disable audit logging
      const loggedUser = '0';
      const sessionSig = __filename;
      const auditDescriptor = 'RUN MIGRATIONS';
      await queryInterface.sequelize.query(
        `SELECT
          set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
          set_config('audit.transactionId', NULL, TRUE) as "transactionId",
          set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
          set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction },
      );

      await queryInterface.addColumn(
        'CollaboratorRoles',
        'roleId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'Roles',
            },
            key: 'id',
          },
        },
      );

      // remove old column from users table
      await queryInterface.sequelize.query(
        `UPDATE "CollaboratorRoles" cr
        SET "roleId" = r.id
        FROM "Roles" r
        WHERE cr.role = r."fullName";`,
        { transaction },
      );

      // remove old column from users table
      await queryInterface.removeColumn(
        'CollaboratorRoles',
        'role',
        { transaction },
      );
    });
  },

  async down() {},
};
