/* eslint-disable import/prefer-default-export */
import { propagateDestroyToFile } from './genericFile'

const afterDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToFile(sequelize, instance, options)
}

export { afterDestroy }
