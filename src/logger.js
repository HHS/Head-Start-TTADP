import { format, transports, createLogger } from 'winston';
import expressWinston from 'express-winston';
import env from './env';

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

const formatter = env.bool('LOG_JSON_FORMAT') ? jsonFormatter : stringFormatter;

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

const requestLogger = expressWinston.logger({
  transports: [
    new transports.Console(),
  ],
  format: format.combine(
    format.label({ label: 'REQUEST' }),
    formatter,
  ),
  dynamicMeta: (req) => {
    if (req && req.session) {
      const { userId } = req.session;
      return {
        userId,
      };
    }
    return {};
  },
});

export {
  logger,
  auditLogger,
  requestLogger,
};
