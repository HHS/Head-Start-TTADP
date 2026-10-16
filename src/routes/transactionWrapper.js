import httpContext from 'express-http-context';
import handleErrors from '../lib/apiErrorHandler';
import { captureSnapshot, hasModifiedData } from '../lib/programmaticTransaction';
import { auditLogger } from '../logger';
import { sequelize } from '../models';
import {
  addAuditTransactionSettings,
  removeFromAuditedTransactions,
} from '../models/auditModelGenerator';

const namespace = 'SERVICE:WRAPPER';

const logContext = {
  namespace,
};

function deferredResponse(res) {
  const calls = [];
  const methods = new Set([
    'status',
    'set',
    'setHeader',
    'header',
    'append',
    'type',
    'attachment',
    'location',
    'redirect',
    'sendFile',
    'sendfile',
    'download',
    'render',
    'cookie',
    'clearCookie',
    'vary',
    'json',
    'jsonp',
    'send',
    'sendStatus',
    'writeHead',
    'writeHeader',
    'flushHeaders',
    'write',
    'end',
  ]);
  const terminalMethods = new Set(['json', 'jsonp', 'send', 'sendStatus', 'redirect', 'end']);
  let state = 'pending';
  let headersSent = false;
  let failure;
  const response = new Proxy(res, {
    get(target, property) {
      if (property === 'headersSent' && state === 'pending') return headersSent;
      const value = Reflect.get(target, property);
      if (typeof value !== 'function') return value;
      if (property === 'destroy') {
        return (error) => {
          if (state === 'pending') {
            failure = error || new Error('Response destroyed before transaction committed.');
            return response;
          }
          if (state === 'committed') return value.call(target, error);
          return response;
        };
      }
      if (!methods.has(property)) return value.bind(target);
      return (...args) => {
        if (state === 'committed') return value.apply(target, args);
        if (state === 'pending') {
          calls.push([property, args]);
          if (terminalMethods.has(property)) headersSent = true;
        }
        return property === 'write' ? true : response;
      };
    },
  });
  return {
    response,
    check() {
      if (failure) throw failure;
    },
    send() {
      this.check();
      state = 'committed';
      for (const [method, args] of calls) res[method](...args);
      calls.length = 0;
    },
    discard() {
      state = 'discarded';
      calls.length = 0;
    },
  };
}

export default function transactionWrapper(
  originalFunction,
  context = '',
  isReadOnly = false,
  transactionOptions = {},
  { deferResponseUntilCommit = true } = {}
) {
  return async function wrapper(req, res, next) {
    const startTime = Date.now();
    const deferred = res && deferResponseUntilCommit ? deferredResponse(res) : null;
    let nextArgs;
    const deferredNext = deferResponseUntilCommit
      ? (...args) => {
          if (args[0] && args[0] !== 'route' && args[0] !== 'router') throw args[0];
          nextArgs = args;
        }
      : next;
    try {
      httpContext.set('auditDescriptor', originalFunction.name);
      if (req) {
        req.inTransactionWrapper = true;
      }
      const result = await sequelize.transaction(transactionOptions, async (transaction) => {
        httpContext.set('transactionId', transaction.id);
        let snapShot;
        try {
          await addAuditTransactionSettings(
            sequelize,
            null,
            null,
            'transaction',
            originalFunction.name
          );

          if (isReadOnly) {
            snapShot = await captureSnapshot(true);
          }

          const result = await originalFunction(req, deferred ? deferred.response : res, deferredNext);
          deferred?.check();

          if (isReadOnly && (await hasModifiedData(snapShot, transaction.id))) {
            throw new Error('Transaction was flagged as READONLY, but has modifed data.');
          }

          const duration = Date.now() - startTime;
          auditLogger.info(`${originalFunction.name} ${context} execution time: ${duration}ms`);
          return result;
        } catch (err) {
          auditLogger.error(`Error executing ${originalFunction.name} ${context}: ${err.message}`);
          throw err;
        } finally {
          removeFromAuditedTransactions();
        }
      });
      deferred?.send();
      if (nextArgs) next(...nextArgs);
      return result;
    } catch (err) {
      deferred?.discard();
      if (req) {
        req.inTransactionWrapper = false;
      }
      if (res?.headersSent) return next(err);
      if (
        Number.isInteger(err?.statusCode) &&
        err?.responseBody &&
        typeof res?.status === 'function'
      ) {
        return res.status(err.statusCode).json(err.responseBody);
      }
      return handleErrors(req, res, err, logContext);
    } finally {
      if (req) {
        delete req.inTransactionWrapper;
      }
    }
  };
}

export function readOnlyTransactionWrapper(
  originalFunction,
  context = '',
  transactionOptions = {}
) {
  return transactionWrapper(originalFunction, context, true, transactionOptions);
}
