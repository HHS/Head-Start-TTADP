const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        /* sql */ `
        -- Matches to created the mapping use hex encodings of the exact bits currently
        -- stored in the database to avoid having to trust that the UTF-8 'unknown character'
        -- value won't get corrupted somewhere along the deployment chain and cause the string
        -- values to not match. An alternative method would be to match on IDs, but this is
        -- vulnerable if anything else ends up changing the ID order in the meantime.
        DROP TABLE IF EXISTS name_map;
        CREATE TEMP TABLE name_map
        AS
        SELECT
          id old_cid,
          LEFT(name,30) old_name, -- here for validation convenience
          'Apoyar al desarrollo de bebés y niños pequeños (BTS-IT)' new_name
        FROM "Courses"
        WHERE ENCODE(name::bytea,'hex') =
        '41706f79617220616c206465736172726f6c6c6f20646520626562efbfbd732079206e69efbfbd6f73207065717565efbfbd6f7320284254532d495429'
        UNION SELECT id, LEFT(name,30), 'Apoyo para niños y familias que están experimentando la carencia de hogar'
        FROM "Courses"
        WHERE ENCODE(name::bytea,'hex') =
        '41706f796f2070617261206e69efbfbd6f7320792066616d696c6961732071756520657374efbfbd6e206578706572696d656e74616e646f206c6120636172656e63696120646520686f676172'
        UNION SELECT id, LEFT(name,30), 'Autoevaluación: su viaje anual'
        FROM "Courses"
        WHERE ENCODE(name::bytea,'hex') =
        '4175746f6576616c75616369efbfbd6e3a207375207669616a6520616e75616c'
        UNION SELECT id, LEFT(name,30), 'Capacitación de Liderazgo y gobernanza en Head Start: valores, reglamentos y habilidades'
        FROM "Courses"
        WHERE ENCODE(name::bytea,'hex') =
        '43617061636974616369efbfbd6e206465204c69646572617a676f207920676f6265726e616e7a6120656e20486561642053746172743a2076616c6f7265732c207265676c616d656e746f73207920686162696c696461646573'
        UNION SELECT id, LEFT(name,30), 'Coaching basado en la práctica'
        FROM "Courses"
        WHERE ENCODE(name::bytea,'hex') =
        '436f616368696e672062617361646f20656e206c61207072efbfbd6374696361'
        UNION SELECT id, LEFT(name,30), 'Evaluación continua (BTS-IT)'
        FROM "Courses"
        WHERE ENCODE(name::bytea,'hex') =
        '4576616c75616369efbfbd6e20636f6e74696e756120284254532d495429'
        UNION SELECT id, LEFT(name,30), 'Gerentes de educación en vivo'
        FROM "Courses"
        WHERE ENCODE(name::bytea,'hex') =
        '476572656e7465732064652065647563616369efbfbd6e20656e207669766f'
        UNION SELECT id, LEFT(name,30), 'La gestión es importante: Asignación de costos'
        FROM "Courses"
        WHERE ENCODE(name::bytea,'hex') =
        '4c61206765737469efbfbd6e20657320696d706f7274616e74653a20417369676e616369efbfbd6e20646520636f73746f73'
        UNION SELECT id, LEFT(name,30), 'Planificación del aprendizaje (BTS-IT)'
        FROM "Courses"
        WHERE ENCODE(name::bytea,'hex') =
        '506c616e69666963616369efbfbd6e2064656c20617072656e64697a616a6520284254532d495429'
        UNION SELECT id, LEFT(name,30), 'Práctica basada en la relación (BTS-IT)'
        FROM "Courses"
        WHERE ENCODE(name::bytea,'hex') =
        '5072efbfbd63746963612062617361646120656e206c612072656c616369efbfbd6e20284254532d495429'
        ;

        -- Insert the new courses
        INSERT INTO "Courses" (name)
        SELECT new_name
        FROM name_map
        ;

        -- Update the old courses with the mapsTo the new courses, and set their deletedAt
        UPDATE "Courses" uc
        SET
          "mapsTo" = c.id,
          "updatedAt" = NOW(),
          "deletedAt" = NOW()
        FROM name_map nm
        JOIN "Courses" c
          ON nm.new_name = c.name
        WHERE uc.id = old_cid
        ;

      `,
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async () => {
      // there's no point in un-fixing this data
    }),
}
