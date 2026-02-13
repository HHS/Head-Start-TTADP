const { prepMigration } = require('../lib/migration')

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [[row]] = await queryInterface.sequelize.query(`
      SELECT id, definitions FROM "Imports" LIMIT 1
    `)

    const defs = row.definitions
    if (!Array.isArray(defs)) {
      throw new Error('Expected definitions to be a JSON array')
    }

    // Deduplicate by fileName (keep last occurrence)
    const uniqueMap = new Map()
    defs.forEach((def) => {
      if (def.fileName) uniqueMap.set(def.fileName, def)
    })

    const deduped = Array.from(uniqueMap.values())

    if (deduped.length !== defs.length) {
      await queryInterface.sequelize.query('UPDATE "Imports" SET definitions = :defs WHERE id = :id', {
        replacements: {
          id: row.id,
          defs: JSON.stringify(deduped),
        },
      })
    }
  },

  down: async () => {
    // Not reversible
  },
}
