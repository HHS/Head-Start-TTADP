const { purifyDataFields } = require('../helpers/purifyFields');

const fieldsToEscape = ['eventName'];

// Notifications for new owners (TR-28) and collaborators (TR-2) are sent by the event service
// (src/services/event.ts), not here, since hooks must not write data.

const beforeUpdate = async (_sequelize, instance) => {
  purifyDataFields(instance, fieldsToEscape);
};

const beforeCreate = async (_sequelize, instance) => {
  purifyDataFields(instance, fieldsToEscape);
};

export { beforeCreate, beforeUpdate };
