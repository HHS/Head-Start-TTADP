import { syncMonitoringReviewStatusLink } from './genericLink'

const beforeCreate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringReviewStatusLink(sequelize, instance, options)])
}

const beforeUpdate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringReviewStatusLink(sequelize, instance, options)])
}

export { beforeCreate, beforeUpdate }
