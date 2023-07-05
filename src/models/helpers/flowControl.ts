function containsName(
  arg:
  string
  | { name: string, prefix?: boolean, suffix?: boolean }
  | Array<
  string
  | { name: string, prefix?: boolean, suffix?: boolean }
  >,
  callingFunctionName?: string | null,
): boolean {
  const functionName = callingFunctionName || (new Error().stack || '').split('\n')[2].trim().match(/at (\S+)/)?.[1] || '';

  if (!functionName || functionName === '') {
    return false;
  }

  function isMatch(value: string | { name: string, prefix?: boolean, suffix?: boolean }): boolean {
    const matchValue = typeof value === 'string'
      ? { name: value, prefix: false, suffix: false }
      : {
        prefix: false,
        suffix: false,
        ...value,
      };

    if (matchValue.prefix) {
      return callingFunctionName.startsWith(matchValue.name);
    }
    if (matchValue.suffix) {
      return callingFunctionName.endsWith(matchValue.name);
    }
    return callingFunctionName === matchValue.name;
  }

  if (typeof arg === 'string' || typeof arg === 'object') {
    return isMatch(arg as string | { name: string, prefix: boolean, suffix: boolean });
  }
  if (Array.isArray(arg)) {
    return (arg as Array<string | { name: string, prefix: boolean, suffix: boolean }>)
      .some((item:string | { name: string, prefix: boolean, suffix: boolean }) => isMatch(item));
  }

  return false;
}

const hasIgnoreHooks = (options) => (options.ignoreHooks !== undefined
  && options.ignoreHooks !== null);

function skipIf(
  options,
  callingFunctionName?: string | null,
): boolean {
  if (!hasIgnoreHooks(options)) return false;

  const functionName = callingFunctionName || (new Error().stack || '').split('\n')[2].trim().match(/at (\S+)/)?.[1] || '';
  return !containsName(options.ignoreHooks, functionName);
}

module.exports = {
  skipIf,
};
