const { JSDOM } = require('jsdom');
const DOMPurify = require('dompurify');
const { auditLogger } = require('../../logger');
const safeParse = require('./safeParse');

/**
 * Intended to be used in sequelize hooks "beforeCreate" and "beforeUpdate"
 * Escapes fields in the data object of a sequelize model instance
 *
 * @param {Object} instance - Sequelize model instance
 * @param {String[]} fields - Array of fields to escape
 * @returns void
 */
function escapeDataFields(instance, fields) {
  const data = safeParse(instance);
  if (!data) return;

  const copy = { ...data };

  const { window } = new JSDOM('');
  const purify = DOMPurify(window);

  try {
    fields.forEach((field) => {
      if (field in copy && copy[field] !== null) {
        copy[field] = purify.sanitize(copy[field]);
      }
    });

    instance.set('data', copy);
  } catch (err) {
    auditLogger.error(JSON.stringify({ 'Error escaping fields': err, instance }));
  }
}

/**
 * Escape fields in sequelize instance
 * Intended to be user in sequelize hooks "beforeCreate" and "beforeUpdate"
 *
 * @param {Object} instance - sequelize model instance
 * @param {String[]} fields - array of fields to escape
 * @returns void
 */
function escapeFields(instance, fields) {
  const changed = instance.changed();

  const { window } = new JSDOM('');
  const purify = DOMPurify(window);

  try {
    fields.forEach((field) => {
      if (changed.includes(field) && instance[field] !== null) {
        instance.set(field, purify.sanitize(instance[field]));
      }
    });
  } catch (err) {
    auditLogger.error(JSON.stringify({ 'Error escaping fields': err, instance }));
  }
}

module.exports = {
  escapeDataFields,
  escapeFields,
};
