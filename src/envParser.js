require('dotenv').config()

exports.isTrue = (key) => process.env[key] === 'true'

exports.getEnvNumber = (key, defaultValue, options = {}) => {
  const { warnOnDefault = false, requireInteger = false } = options
  const raw = process.env[key]
  if (raw === undefined || raw === '') {
    if (warnOnDefault) {
      process.emitWarning(`${key} not set; defaulting to ${defaultValue}`)
    }
    return defaultValue
  }

  const value = Number(raw)
  if (Number.isNaN(value)) {
    throw new Error(`${key} must be a number, got: ${raw}`)
  }

  if (!Number.isFinite(value)) {
    throw new Error(`${key} must be a finite number, got: ${raw}`)
  }

  if (requireInteger && !Number.isInteger(value)) {
    throw new Error(`${key} must be an integer, got: ${raw}`)
  }

  return value
}
