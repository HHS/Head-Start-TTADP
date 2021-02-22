const { format, transports, createLogger } = require('winston');

const formatFunc = ({
  level, message, label, timestamp, meta = {},
}) => `${timestamp} ${label || '-'} ${level}: ${message} ${JSON.stringify(meta)}`;

const stringFormatter = format.combine(
  format.timestamp(),
  format.colorize(),
  format.align(),
  format.printf(formatFunc),
);

const jsonFormatter = format.combine(
  format.timestamp(),
  format.json(),
);

const formatter = process.env.LOG_JSON_FORMAT ? jsonFormatter : stringFormatter;

const logger = createLogger({
  level: process.env.LOG_LEVEL,
  format: formatter,
  transports: [
    new transports.Console(),
  ],
});

const auditLogger = createLogger({
  level: 'info',
  format: format.combine(
    format.label({ label: 'AUDIT' }),
    formatter,
  ),
  transports: [
    new transports.Console(),
  ],
});

module.exports = {
  logger,
  auditLogger,
};
