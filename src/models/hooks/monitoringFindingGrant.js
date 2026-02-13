import { syncMonitoringFindingLink, syncMonitoringFindingStatusLink, syncMonitoringGranteeLink } from './genericLink'

const beforeCreate = async (sequelize, instance, options) => {
  await Promise.all([
    syncMonitoringFindingLink(sequelize, instance, options),
    syncMonitoringFindingStatusLink(sequelize, instance, options),
    syncMonitoringGranteeLink(sequelize, instance, options),
  ])
}

const beforeUpdate = async (sequelize, instance, options) => {
  await Promise.all([
    syncMonitoringFindingLink(sequelize, instance, options),
    syncMonitoringFindingStatusLink(sequelize, instance, options),
    syncMonitoringGranteeLink(sequelize, instance, options),
  ])
}

export { beforeCreate, beforeUpdate }
