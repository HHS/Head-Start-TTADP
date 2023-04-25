import { VALID_URL_REGEX } from '../../lib/urlUtils';
import { addToResourceQueue } from '../../services/resourceQueue';

const autoPopulateDomain = (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.url && (instance.domain === undefined
    || instance.domain === null)) {
    const [{ groups: { host, ip } }] = instance.url.matchAll(VALID_URL_REGEX);
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
  await addToResourceQueue(instance.id);
};

export {
  autoPopulateDomain,
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
};
