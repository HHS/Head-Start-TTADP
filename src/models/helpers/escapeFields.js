import { escape } from 'lodash';
import { auditLogger } from '../../logger';
import safeParse from './safeParse';

/**
 * Intended to be used in sequelize hooks "beforeCreate" and "beforeUpdate"
 * Escapes fields in the data object of a sequelize model instance
 *
 * @param {Object} instance - Sequelize model instance
 * @param {String[]} fields - Array of fields to escape
 * @returns void
 */
export function escapeDataFields(instance, fields) {
  const data = safeParse(instance);
  if (!data) return;

  const copy = { ...data };

  try {
    fields.forEach((field) => {
      if (field in copy && copy[field] !== null) {
        copy[field] = escape(copy[field]);
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
export default function escapeFields(instance, fields) {
  const changed = instance.changed();

  try {
    fields.forEach((field) => {
      if (changed.includes(field) && instance[field] !== null) {
        instance.set(field, escape(instance[field]));
      }
    });
  } catch (err) {
    auditLogger.error(JSON.stringify({ 'Error escaping fields': err, instance }));
  }
}
