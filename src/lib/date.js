import moment from 'moment'

/**
 * Attempts to parse a date string using multiple known formats.
 * Returns a valid Date object or null if parsing fails.
 */
export default function parseDate(value) {
  if (!value) return null

  const formats = [
    // Slash formats
    'MM/DD/YYYY',
    'M/D/YYYY',
    'M/DD/YYYY',
    'MM/D/YYYY',
    'MM/DD/YY',
    'M/D/YY',
    'M/DD/YY',
    'MM/D/YY',

    // Dash formats
    'YYYY-MM-DD',
    'YYYY-M-D',
    'YYYY-M-DD',
    'YYYY-MM-D',

    // Dot formats
    'M.D.YYYY',
    'MM.D.YYYY',
    'M.DD.YYYY',
    'M.D.YY',
    'MM.DD.YY',
  ]

  const parsed = formats.find((format) => moment(value, format, true).isValid())
  return parsed ? moment(value, parsed, true).toDate() : null
}
