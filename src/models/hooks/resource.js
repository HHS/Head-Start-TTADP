import { VALID_URL_REGEX } from '../../lib/urlUtils';

const autoPopulateDomain = (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.domain === undefined
    || instance.domain === null) {
    let [{ groups }] = instance.url.matchAll(VALID_URL_REGEX);
    groups = { ...groups };
    const { host, ip } = groups;
    const domain = host || ip;
    if (domain) {
      instance.set('domain', domain);
      if (!options.fields.includes('domain')) {
        options.fields.push('domain');
      }
    }
  }
};

const beforeValidate = async (sequelize, instance, options) => {
  autoPopulateDomain(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
};

const afterUpdate = async (sequelize, instance, options) => {
};

const afterCreate = async (sequelize, instance, options) => {
};

export {
  autoPopulateDomain,
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
};
