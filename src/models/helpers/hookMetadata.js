function getSingularOrPluralData(options, singular, plural) {
  let data;
  // check to see if singular or plural numbers are validly defined
  // when defined a more efficient search can be used
  if (options.hookMetadata !== undefined
    && options.hookMetadata !== null) {
    if (options.hookMetadata[singular] !== undefined
    && options.hookMetadata[singular] !== null
    && typeof options.hookMetadata[singular] === 'number') {
      data = [options.hookMetadata[singular]];
    } else if (options.hookMetadata[plural] !== undefined
    && options.hookMetadata[plural] !== null
    && Array.isArray(options.hookMetadata[plural])
    && options.hookMetadata[plural].map((i) => typeof i).every((i) => i === 'number')) {
      data = options.hookMetadata[plural];
    }
  }
  return data;
}

module.exports = getSingularOrPluralData;
