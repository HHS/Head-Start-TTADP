const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)

      // Remove the potential for an error to be created if more then one match is found
      await queryInterface.sequelize.query(
        /* sql */ `
        CREATE OR REPLACE FUNCTION public."ZAFDescriptorToID"(
            _param_id text
        )
        RETURNS integer
        LANGUAGE plpgsql
        COST 100
        VOLATILE PARALLEL UNSAFE
        AS $BODY$
        DECLARE
            Did INTEGER;
        BEGIN
            IF _param_id IS NOT NULL THEN
                -- Select the minimum id where descriptor matches
                SELECT MIN(id) INTO Did 
                FROM "ZADescriptor" 
                WHERE descriptor = _param_id;

                -- If no matching descriptor is found, insert it and retrieve the new id
                IF Did IS NULL THEN
                    INSERT INTO "ZADescriptor" (descriptor) 
                    VALUES (_param_id)
                    RETURNING id INTO Did;
                END IF;
            END IF;

            RETURN Did;
        END
        $BODY$;
      `,
        { transaction }
      )

      // Remove any existing duplicates
      await queryInterface.sequelize.query(
        /* sql */ `
        WITH duplicates AS (
            SELECT
                id,
                descriptor,
                ROW_NUMBER() OVER (
                    PARTITION BY descriptor
                    ORDER BY id ASC
                ) AS rn
            FROM
                public."ZADescriptor"
        )
        DELETE FROM public."ZADescriptor"
        WHERE id IN (
            SELECT id FROM duplicates WHERE rn > 1
        );
      `,
        { transaction }
      )

      // Add constraint to prevent any duplicates ever again
      await queryInterface.sequelize.query(
        /* sql */ `
        ALTER TABLE public."ZADescriptor"
        ADD CONSTRAINT unique_descriptor UNIQUE (descriptor);
      `,
        { transaction }
      )
    }),
  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        /* sql */ `
        ALTER TABLE public."ZADescriptor"
        DROP CONSTRAINT unique_descriptor;
      `,
        { transaction }
      )
    }),
}
