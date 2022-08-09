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
        `DO
        $$
        DECLARE
            u record;
        BEGIN
        FOR u IN SELECT "id" as collaborator_role_id, "role" as "collaborator_role" FROM "CollaboratorRoles"
          LOOP               
            UPDATE "CollaboratorRoles" SET "roleId" = (SELECT "id" from "Roles" WHERE u.collaborator_role = "Roles"."fullName") WHERE id = u.collaborator_role_id;
          END LOOP; 
          END;
        $$
        LANGUAGE plpgsql;
        `,
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
