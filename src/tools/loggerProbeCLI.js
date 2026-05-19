import { auditLogger, logger, withLogMetadata } from '../logger';

const createNestedError = () => {
  const error = new Error('Logger probe nested error');
  error.code = 'LOGGER_PROBE_NESTED';
  error.parent = new Error('Logger probe parent error');
  error.parent.sql = 'select * from "LoggerProbe" where id = $1';
  error.parent.parameters = [123];
  return error;
};

const createCircularError = () => {
  const error = new Error('Logger probe circular error');
  error.code = 'LOGGER_PROBE_CIRCULAR';
  error.details = {
    operation: 'loggerProbe',
  };
  error.details.self = error.details;
  return error;
};

const createCauseError = () => {
  const cause = new Error('Logger probe cause');
  cause.code = 'LOGGER_PROBE_CAUSE';
  return new Error('Logger probe error with cause', { cause });
};

const samples = [
  {
    name: 'direct-error',
    run: () => auditLogger.error('Logger probe direct error'),
  },
  {
    name: 'message-plus-error',
    run: () =>
      auditLogger.error('Logger probe message plus error', new Error('Logger probe arg error')),
  },
  {
    name: 'metadata-error',
    run: () =>
      auditLogger.error(
        'Logger probe metadata error',
        withLogMetadata(createNestedError(), { requestId: 'logger-probe-request' })
      ),
  },
  {
    name: 'circular-metadata',
    run: () => auditLogger.error('Logger probe circular metadata', createCircularError()),
  },
  {
    name: 'error-cause',
    run: () => auditLogger.error('Logger probe error cause', createCauseError()),
  },
  {
    name: 'app-logger-warning',
    run: () =>
      logger.warn('Logger probe app warning', {
        warning: {
          name: 'LoggerProbeWarning',
          message: 'Logger probe warning metadata',
        },
      }),
  },
];

const only = process.argv
  .slice(2)
  .find((arg) => arg.startsWith('--only='))
  ?.replace('--only=', '');

const selectedSamples = only ? samples.filter((sample) => sample.name === only) : samples;

if (only && selectedSamples.length === 0) {
  auditLogger.error(
    `Unknown logger probe sample: ${only}`,
    withLogMetadata(new Error(`Unknown logger probe sample: ${only}`), {
      availableSamples: samples.map((sample) => sample.name),
    })
  );
  process.exit(2);
}

auditLogger.info('Starting logger probe', {
  samples: selectedSamples.map((sample) => sample.name),
});

selectedSamples.forEach((sample) => {
  auditLogger.info(`Running logger probe sample: ${sample.name}`);
  sample.run();
});

auditLogger.info('Logger probe complete');
