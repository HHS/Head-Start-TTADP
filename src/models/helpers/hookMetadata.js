// check to see if hookMetadata is defined on the options object passed to the hook.
// this is to allow us to optimize code path within hooks based on data that might
// be present to the original calling location in code, but difficult to obtain within
// the hook without additional queries into the database. These additional queries can
// lead to performance issues.
const hasHookMetadata = (options) => (options.hookMetadata !== undefined
  && options.hookMetadata !== null);

// check if the metadata has the key passed.
const hasHookMetadataKey = (options, key) => (options.hookMetadata[key] !== undefined
  && options.hookMetadata[key] !== null);

// check for a singular or plural form of a key, return an array of the values at either form.
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
