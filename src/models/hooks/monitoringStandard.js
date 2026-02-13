import { syncMonitoringStandardLink } from './genericLink'

const beforeCreate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringStandardLink(sequelize, instance, options)])
}

const beforeUpdate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringStandardLink(sequelize, instance, options)])
}

export { beforeCreate, beforeUpdate }
