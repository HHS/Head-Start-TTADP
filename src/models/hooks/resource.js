const { VALID_URL_REGEX } = require('@ttahub/common')

const autoPopulateDomain = (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.url && (instance.domain === undefined || instance.domain === null)) {
    const [
      {
        groups: { host, ip },
      },
    ] = instance.url.matchAll(VALID_URL_REGEX)
    const domain = host || ip
    if (domain) {
      instance.set('domain', domain)
      if (!options.fields.includes('domain')) {
        options.fields.push('domain')
      }
    }
  }
}

const beforeValidate = async (sequelize, instance, options) => {
  autoPopulateDomain(sequelize, instance, options)
}

const beforeUpdate = async (sequelize, instance, options) => {}

const afterUpdate = async (sequelize, instance, options) => {}

const afterCreate = async (sequelize, instance, options) => {
  if (!instance.title) {
    // This is to resolve a recursive reference issue:
    // Service: /services/resourceQueue Imports: /lib/resource
    // Lib: /lib/resource Imports: /models/{Resource}
    // Model: /models/{Resource} Imports: /models/hooks/resource
    // Hook: /models/hooks/resource Imports: /services/resourceQueue
    // eslint-disable-next-line global-require
    const { addGetResourceMetadataToQueue } = require('../../services/resourceQueue')
    addGetResourceMetadataToQueue(instance.id, instance.url)
  }
}

export { autoPopulateDomain, beforeValidate, beforeUpdate, afterUpdate, afterCreate }
