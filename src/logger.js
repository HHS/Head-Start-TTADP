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
const level = process.env.LOG_LEVEL || 'info';

const logger = createLogger({
  level,
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
  dynamicMeta: (req, res) => {
    if (req && req.session) {
      return {
        userId: req.session.userId,
      };
    }
    if (res && res.locals) {
      return {
        userId: res.locals.userId,
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
