import { DateTime } from 'luxon';

export const guessLocalTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

export const formatNowForTimeZoneMessage = (timeZone = guessLocalTimeZone()) => DateTime
  .now()
  .setZone(timeZone)
  .toFormat("MM/dd/yyyy 'at' h:mm a ZZZZ")
  .replace(/\b(AM|PM)\b/g, (match) => match.toLowerCase());

const toLuxonFormat = (format = '') => format
  .replace(/\[([^\]]+)\]/g, "'$1'")
  .replace(/YYYY/g, 'yyyy')
  .replace(/YY/g, 'yy')
  .replace(/DD/g, 'dd')
  .replace(/D/g, 'd')
  .replace(/MMMM/g, 'LLLL')
  .replace(/MMM/g, 'LLL');

const toDateTime = (value, inputFormat) => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return DateTime.fromJSDate(value);
  if (typeof value === 'number') return DateTime.fromMillis(value);

  if (typeof value === 'string') {
    if (inputFormat) {
      const parsedByFormat = DateTime.fromFormat(value, toLuxonFormat(inputFormat));
      if (parsedByFormat.isValid) return parsedByFormat;
    }

    const parsedIso = DateTime.fromISO(value);
    if (parsedIso.isValid) return parsedIso;

    const parsedRfc = DateTime.fromRFC2822(value);
    if (parsedRfc.isValid) return parsedRfc;

    const parsedSql = DateTime.fromSQL(value);
    if (parsedSql.isValid) return parsedSql;
  }

  const parsedJs = DateTime.fromJSDate(new Date(value));
  return parsedJs.isValid ? parsedJs : null;
};

const toDateTimeUtc = (value, inputFormat) => {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return DateTime.fromJSDate(value, { zone: 'utc' });
  if (typeof value === 'number') return DateTime.fromMillis(value, { zone: 'utc' });

  if (typeof value === 'string') {
    if (inputFormat) {
      const parsedByFormat = DateTime.fromFormat(
        value,
        toLuxonFormat(inputFormat),
        { zone: 'utc' },
      );
      if (parsedByFormat.isValid) return parsedByFormat;
    }

    const parsedIso = DateTime.fromISO(value, { zone: 'utc', setZone: true });
    if (parsedIso.isValid) return parsedIso;

    const parsedRfc = DateTime.fromRFC2822(value, { zone: 'utc' });
    if (parsedRfc.isValid) return parsedRfc;

    const parsedSql = DateTime.fromSQL(value, { zone: 'utc' });
    if (parsedSql.isValid) return parsedSql;
  }

  const parsedJs = DateTime.fromJSDate(new Date(value), { zone: 'utc' });
  return parsedJs.isValid ? parsedJs : null;
};

export const formatSaveTimestamp = (value, includeZone = false) => {
  const dt = toDateTime(value);
  if (!dt) return 'Invalid date';

  const formatted = dt
    .setZone(guessLocalTimeZone())
    .toFormat(includeZone ? "MM/dd/yyyy 'at' h:mm a ZZZZ" : "MM/dd/yyyy 'at' h:mm a");

  return formatted.replace(/\b(AM|PM)\b/g, (match) => match.toLowerCase());
};

export const parseDateTimeFromFormat = (value, format) => {
  if (value === null || value === undefined || value === '') return null;
  const dt = DateTime.fromFormat(value, toLuxonFormat(format));
  return dt.isValid ? dt : null;
};

export const parseDateTimeFromFormats = (value, formats = []) => {
  if (value === null || value === undefined || value === '') return null;
  const format = formats.find((f) => !!parseDateTimeFromFormat(value, f));
  if (!format) return null;
  return parseDateTimeFromFormat(value, format);
};

export const formatDateValue = (
  value,
  outputFormat = 'MM/DD/YYYY',
  inputFormat,
) => {
  const dt = toDateTime(value, inputFormat);
  if (!dt) return 'Invalid date';

  return dt.toFormat(toLuxonFormat(outputFormat));
};

export const formatDateValueUtc = (
  value,
  outputFormat = 'MM/DD/YYYY',
  inputFormat,
) => {
  const dt = toDateTimeUtc(value, inputFormat);
  if (!dt) return 'Invalid date';

  return dt.toUTC().toFormat(toLuxonFormat(outputFormat));
};

export const isValidForFormat = (value, format) => {
  if (value === null || value === undefined || value === '') return false;
  return !!parseDateTimeFromFormat(value, format);
};

export const formatDateValueFromFormat = (
  value,
  inputFormat,
  outputFormat = 'MM/DD/YYYY',
) => {
  const dt = parseDateTimeFromFormat(value, inputFormat);
  if (!dt) {
    return 'Invalid date';
  }

  return dt.toFormat(toLuxonFormat(outputFormat));
};

const ordinalSuffix = (day) => {
  const v = day % 100;
  if (v >= 11 && v <= 13) return `${day}th`;

  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
};

export const formatDateValueWithShortMonthOrdinalDayYear = (value, inputFormat) => {
  const dt = toDateTime(value, inputFormat);
  if (!dt) return 'Invalid date';

  return `${dt.toFormat('LLL')} ${ordinalSuffix(dt.day)}, ${dt.toFormat('yyyy')}`;
};

export const now = () => DateTime.local();
