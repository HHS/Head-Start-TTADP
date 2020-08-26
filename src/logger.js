import winston from 'winston';
import expressWinston from 'express-winston';
import env from './env';

const formatFunc = ({
  level, message, label, timestamp, meta = {},
}) => `${timestamp} ${label || '-'} ${level}: ${message} ${JSON.stringify(meta)}`;

const stringFormatter = winston.format.combine(
  winston.format.timestamp(),
  winston.format.colorize(),
  winston.format.align(),
  winston.format.printf(formatFunc),
);

const jsonFormatter = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json(),
);

const formatter = env.bool('LOG_JSON_FORMAT') ? jsonFormatter : stringFormatter;

const logger = winston.createLogger({
  level: 'info',
  format: formatter,
  transports: [
    new winston.transports.Console(),
  ],
});

export const requestLogger = expressWinston.logger({
  transports: [
    new winston.transports.Console(),
  ],
  format: formatter,
});

export default logger;
