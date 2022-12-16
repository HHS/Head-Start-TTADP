const domainRegex = '^(?:(?:http|ftp|https|file):\\/\\/)?(?:www\\.)?((?:[\\w%_-]+(?:(?:\\.[\\w%_-]+)+)|(?:\\/[\\w][:])))';

const autoPopulateDomain = (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.domain === undefined
    || instance.domain === null) {
    const domain = instance.url.match(domainRegex);
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
