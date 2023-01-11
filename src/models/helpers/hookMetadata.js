const hasHookMetadata = (options) => (options.hookMetadata !== undefined
  && options.hookMetadata !== null);

const hasHookMetadataKey = (options, key) => (options.hookMetadata[key] !== undefined
  && options.hookMetadata[key] !== null);

const getSingularOrPluralData = (options, singular, plural) => {
  let data;
  // check to see if singular or plural numbers are validly defined
  // when defined a more efficient search can be used
  if (hasHookMetadata(options)) {
    if (hasHookMetadataKey(options, singular)
    && typeof options.hookMetadata[singular] === 'number') {
      data = [options.hookMetadata[singular]];
    } else if (hasHookMetadataKey(options, plural)
    && Array.isArray(options.hookMetadata[plural])
    && options.hookMetadata[plural].map((i) => typeof i).every((i) => i === 'number')) {
      data = options.hookMetadata[plural];
    }
  }
  return data;
};

export {
  hasHookMetadata,
  hasHookMetadataKey,
  getSingularOrPluralData,
};
