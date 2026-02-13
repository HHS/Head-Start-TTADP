const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename
      await prepMigration(queryInterface, transaction, sessionSig)

      await queryInterface.addColumn(
        'Resources',
        'mapsTo',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Resources', // Table name
            key: 'id', // Column to reference
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL', // Adjust as needed (e.g., 'CASCADE' or 'RESTRICT')
        },
        { transaction }
      )

      await queryInterface.sequelize.query(
        /* sql */ `
        -- Create new headstart.gov resources for all eclkc resources that are missing.
         WITH orig_resources AS (
            SELECT DISTINCT ON ("url")
            *
            FROM "Resources"
            WHERE "domain" = 'eclkc.ohs.acf.hhs.gov'
            ORDER BY "url", "metadataUpdatedAt" DESC, "updatedAt" DESC
            ),
        existing_new_resources AS (
            SELECT
            "url"
            FROM "Resources"
            WHERE "domain" = 'headstart.gov'
            GROUP BY 1
        ) INSERT INTO "Resources" (
        "domain", "url", "title", "mimeType",
        "lastStatusCode", "metadata", "metadataUpdatedAt",
        "mapsTo", "createdAt", "updatedAt"
        )
        SELECT
        'headstart.gov' AS domain,
        regexp_replace(
            o."url", 'eclkc.ohs.acf.hhs.gov',
            'headstart.gov'
        ) AS "url",
        o."title",
        o."mimeType",
        o."lastStatusCode",
        o."metadata",
        o."metadataUpdatedAt",
        null AS "mapsTo",
        NOW() "createdAt",
        NOW() "updatedAt"
        FROM
        orig_resources o
        LEFT JOIN existing_new_resources e
            -- Prevent duplicating existing headstart.gov resources.
            ON regexp_replace(o."url", 'eclkc.ohs.acf.hhs.gov', 'headstart.gov') = e."url"
        WHERE
        e."url" IS NULL;

        -- Set the mapsTo for all old eclkc resources to the new headstart.gov resources.
        WITH new_resources AS (
        SELECT
            *
        FROM
            "Resources"
        WHERE
            "domain" = 'headstart.gov'
        )
        UPDATE
        "Resources" r
        SET
        "mapsTo" = n.id
        FROM
        new_resources n
        -- Where everything in the URL matches expect the domain, which we expect to be headstart.gov.
        WHERE
        r."url" = regexp_replace(
            n."url", 'headstart.gov', 'eclkc.ohs.acf.hhs.gov'
        );
    `,
        { transaction }
      )
    })
  },

  async down(queryInterface) {
    // Drop the mapsTo column.
    await queryInterface.removeColumn('Resources', 'mapsTo')
  },
}
