import { syncGrantNumberLink, syncMonitoringReviewLink } from './genericLink'

const beforeCreate = async (sequelize, instance, options) => {
  await Promise.all([syncGrantNumberLink(sequelize, instance, options), syncMonitoringReviewLink(sequelize, instance, options)])
}

const beforeUpdate = async (sequelize, instance, options) => {
  await Promise.all([syncGrantNumberLink(sequelize, instance, options), syncMonitoringReviewLink(sequelize, instance, options)])
}

export { beforeCreate, beforeUpdate }
