const { JSDOM } = require('jsdom')
const DOMPurify = require('dompurify')
const { auditLogger } = require('../../logger')
const safeParse = require('./safeParse')

/**
 * Intended to be used in sequelize hooks "beforeCreate" and "beforeUpdate"
 * Escapes fields in the data object of a sequelize model instance
 *
 * @param {Object} instance - Sequelize model instance
 * @param {String[]} fields - Array of fields
 * @returns void
 */
function purifyDataFields(instance, fields) {
  const data = safeParse(instance)
  if (!data) return

  const copy = { ...data }

  const { window } = new JSDOM('')
  const purify = DOMPurify(window)

  try {
    fields.forEach((field) => {
      if (field in copy && copy[field] !== null) {
        copy[field] = purify.sanitize(copy[field])
      }
    })

    instance.set('data', copy)
  } catch (err) {
    auditLogger.error(JSON.stringify({ 'Error purifying fields': err, instance }))
  }
}

/**
 * Escape fields in sequelize instance
 * Intended to be user in sequelize hooks "beforeCreate" and "beforeUpdate"
 *
 * @param {Object} instance - sequelize model instance
 * @param {String[]} fields - array of fields
 * @returns void
 */
function purifyFields(instance, fields) {
  const { window } = new JSDOM('')
  const purify = DOMPurify(window)

  if (!('changed' in instance) || typeof instance.changed !== 'function') {
    return
  }

  try {
    const changed = instance.changed()
    if (!changed || !Array.isArray(changed)) return
    fields.forEach((field) => {
      if (changed.includes(field) && typeof instance[field] === 'string') {
        instance.set(field, purify.sanitize(instance[field]))
      }
    })
  } catch (err) {
    auditLogger.error(JSON.stringify({ 'Error purifying fields': err, instance }))
  }
}

module.exports = {
  purifyDataFields,
  purifyFields,
}
