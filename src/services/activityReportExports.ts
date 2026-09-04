// Streaming CSV exports (AR / goal / objective) that replace the buffered AR
// download. Rows are pulled from a server-side cursor in batches instead of
// buffered, so peak memory stays flat on large exports. The whole stream runs in
// one explicit transaction pinning a single connection (bare queries can't rely
// on cls-hooked surviving the response 'drain' await); statement/idle timeouts
// cap how long a stalled client can hold that connection.
//
// Two guards keep a hung export from starving the shared pool:
//   1. A per-process concurrency cap (MAX_CONCURRENT_EXPORTS) bounds how many
//      pool connections exports can ever hold at once, so a wedged export can't
//      swallow the whole pool the rest of the app shares.
//   2. A wall-clock deadline (EXPORT_DEADLINE_MS) caps total export duration,
//      bounding both how long one export holds a connection and how much a single
//      request can pull from the database. It is enforced two ways: a flag checked
//      at the top of the fetch loop stops a healthy client that would otherwise
//      keep pulling past the deadline, and a race against the per-chunk
//      backpressure wait stops a client stalled on 'drain' (which Postgres'
//      statement/idle timeouts can't catch, since no query is in flight there).
import stringify from 'csv-stringify/lib/sync';
import { QueryTypes, type Transaction } from 'sequelize';
import db from '../models';
import { readJsonHeaderFromFile } from './ssdi';

export const EXPORT_DATA_SETS = {
  'activity-reports': 'exports/activity-reports.sql',
  goals: 'exports/goals.sql',
  objectives: 'exports/objectives.sql',
} as const;

export type ExportDataSet = keyof typeof EXPORT_DATA_SETS;

export const isValidDataSet = (dataSet: unknown): dataSet is ExportDataSet =>
  typeof dataSet === 'string' && Object.hasOwn(EXPORT_DATA_SETS, dataSet);

// output.sorting.columns whitelists the columns the SQL has ORDER BY branches
// for (narrower than SSDI's schema-derived list), so we read it directly.
interface ExportSorting {
  default?: Array<{ name: string; order: 'ASC' | 'DESC' }>;
  supportsCustomSorting?: boolean;
  columns?: string[];
}

// Marker separating each file's setup (SET LOCAL, temp tables) from the final
// SELECT the cursor wraps.
const STREAM_SPLIT_MARKER = '-- @stream-final-select';
// Rows pulled per cursor round-trip; bounds Node-side memory.
const FETCH_BATCH_SIZE = 2000;
const EXPORT_CURSOR = 'ttahub_export_cursor';
const STATEMENT_TIMEOUT = '180s';
const IDLE_IN_TRANSACTION_TIMEOUT = '30s';
// Cap on how many reports one export may cover, to stay inside the performance
// envelope. Callers over this must narrow their filters.
export const MAX_EXPORT_REPORT_IDS = 10000;
// Hard cap on total export duration, enforced regardless of client speed. Bounds
// both how long one export can hold a pooled connection and how much a single
// request can pull from the database in one go. Five minutes is ample to download
// reports even on a slow connection.
export const EXPORT_DEADLINE_MS = 5 * 60 * 1000;
// Most exports one process will run concurrently. Three lets a user pull one of
// each data set at once; beyond that we reject rather than let exports encroach
// on the connection pool shared with the rest of the app.
export const MAX_CONCURRENT_EXPORTS = 3;

// In-process count of exports currently holding (or about to hold) a connection.
// Per-process, which matches the per-process pool: each instance guards its own.
let activeExports = 0;

// Caller mistakes (bad data set / unsupported sort) -> 400 rather than 500.
export class ExportRequestError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'ExportRequestError';
    this.statusCode = 400;
  }
}

// Too many exports already running -> 429 so the client can retry later, rather
// than queueing on (and potentially exhausting) the shared connection pool.
export class ExportCapacityError extends Error {
  statusCode: number;

  constructor(message: string) {
    super(message);
    this.name = 'ExportCapacityError';
    this.statusCode = 429;
  }
}

// The export exceeded EXPORT_DEADLINE_MS and was torn down. Fires mid-stream, so
// it carries no statusCode; the handler surfaces it by destroying the socket.
export class ExportTimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportTimeoutError';
  }
}

export interface ActivityReportExportOptions {
  // Raw request values; validated here so the handler stays thin.
  dataSet: unknown;
  // Already-resolved AR ids from the page. Required: exports must be scoped to a
  // bounded set, never the whole table. An empty list yields an empty export.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  reportIds: any;
  // User's accessible regions; enforced in-query as defense in depth.
  regionIds: number[];
  sortBy?: string;
  direction?: string;
}

interface StreamCallbacks {
  // After the cursor opens, before the first row: the handler starts the response.
  onStart: (meta: { outputName: string }) => void | Promise<void>;
  // Per CSV chunk; the handler writes it and applies backpressure.
  onChunk: (chunk: string) => void | Promise<void>;
}

const splitExportSql = (body: string): { setup: string; finalSelect: string } => {
  const idx = body.indexOf(STREAM_SPLIT_MARKER);
  if (idx === -1) {
    // No marker: treat the whole body as a single streamable SELECT.
    return { setup: '', finalSelect: body.trim().replace(/;\s*$/, '') };
  }
  const setup = body.slice(0, idx);
  const finalSelect = body
    .slice(idx + STREAM_SPLIT_MARKER.length)
    .trim()
    .replace(/;\s*$/, '');
  return { setup, finalSelect };
};

// Coerce and integer-check the client-supplied ids before they reach raw SQL.
const validateReportIds = (reportIds: unknown): number[] => {
  if (reportIds === undefined || reportIds === null) {
    throw new ExportRequestError('reportIds is required.');
  }
  const list = Array.isArray(reportIds) ? reportIds : [reportIds];
  const ids = list.map(Number);
  if (ids.some((id) => !Number.isInteger(id))) {
    throw new ExportRequestError('reportIds must be a list of integers.');
  }
  if (ids.length > MAX_EXPORT_REPORT_IDS) {
    throw new ExportRequestError(
      `Export is limited to ${MAX_EXPORT_REPORT_IDS} reports; narrow the filters and try again.`
    );
  }
  return ids;
};

// Validate the requested sort against the header whitelist. Returns the
// column/direction to inject, or null to keep the SQL's default sort. Unknown
// columns throw (a 400) rather than silently falling back.
const resolveSort = (
  dataSet: string,
  sorting: ExportSorting | undefined,
  sortBy?: string,
  direction?: string
): { column: string; direction: 'ASC' | 'DESC' } | null => {
  if (!sortBy) {
    return null;
  }
  const supported = sorting?.columns ?? [];
  if (!supported.includes(sortBy)) {
    throw new ExportRequestError(
      `Unsupported sort column "${sortBy}" for data set "${dataSet}". ` +
        `Supported columns: ${supported.join(', ') || '(none)'}.`
    );
  }
  const normalized = (direction ?? 'ASC').toUpperCase();
  if (normalized !== 'ASC' && normalized !== 'DESC') {
    throw new ExportRequestError(`Unsupported sort direction "${direction}". Use ASC or DESC.`);
  }
  return { column: sortBy, direction: normalized };
};

// Set the ssdi.* vars the SQL reads, transaction-locally. Sequential: one
// pinned connection.
const setExportConfig = async (
  transaction: Transaction,
  entries: Array<[string, unknown]>
): Promise<void> => {
  for (const [key, value] of entries) {
    // eslint-disable-next-line no-await-in-loop
    await db.sequelize.query('SELECT set_config($1, $2, true)', {
      bind: [key, JSON.stringify(value)],
      transaction,
      type: QueryTypes.SELECT,
    });
  }
};

// Runs one export: the caller passes an already-resolved AR id list plus the
// user's regions; the heavy setup runs once, then rows stream from the cursor.
export async function streamActivityReportExportCsv(
  options: ActivityReportExportOptions,
  { onStart, onChunk }: StreamCallbacks
): Promise<{ rowCount: number }> {
  const { dataSet, reportIds, regionIds, sortBy, direction } = options;

  if (!isValidDataSet(dataSet)) {
    throw new ExportRequestError(
      `Invalid dataSet. Expected one of: ${Object.keys(EXPORT_DATA_SETS).join(', ')}.`
    );
  }
  const filePath = EXPORT_DATA_SETS[dataSet];
  const ids = validateReportIds(reportIds);

  const cachedFile = await readJsonHeaderFromFile(filePath);
  if (!cachedFile) {
    throw new Error(`Unable to read export definition for data set: ${dataSet}`);
  }
  const { jsonHeader, query } = cachedFile;
  const outputName = jsonHeader.output.defaultName;
  const sort = resolveSort(
    dataSet,
    jsonHeader.output.sorting as ExportSorting | undefined,
    sortBy,
    direction
  );
  const { setup, finalSelect } = splitExportSql(query);

  const config: Array<[string, unknown]> = [
    ['ssdi.activityReportIds', ids],
    ['ssdi.region', regionIds],
  ];
  if (sort) {
    config.push(['ssdi.sortOrder.column', [sort.column]]);
    config.push(['ssdi.sortOrder.direction', [sort.direction]]);
  }

  // Reserve a slot before we take a connection; reject rather than pile onto the
  // shared pool. Released in the finally below, so every early return/throw frees
  // it.
  if (activeExports >= MAX_CONCURRENT_EXPORTS) {
    throw new ExportCapacityError(
      'Too many exports are running right now. Please try again in a moment.'
    );
  }
  activeExports += 1;

  let deadlineTimer: NodeJS.Timeout | undefined;
  let transaction: Transaction | undefined;
  let rowCount = 0;
  try {
    transaction = await db.sequelize.transaction();

    // Enforced two ways. The race (below) stops a client stalled on 'drain':
    // onChunk stays pending, so the deadline is the only thing that settles.
    // deadlineExceeded stops a healthy client that keeps pulling: onChunk resolves
    // synchronously, and an already-fulfilled onChunk beats an already-rejected
    // deadline in Promise.race, so the flag checked at the top of the loop — not
    // the race — is what halts the pull once the deadline has passed. The .catch
    // keeps the rejection from surfacing as unhandled when nothing is awaiting it.
    let deadlineExceeded = false;
    const deadlineError = () =>
      new ExportTimeoutError(`Export exceeded ${EXPORT_DEADLINE_MS}ms and was aborted.`);
    const deadline = new Promise<never>((_, reject) => {
      deadlineTimer = setTimeout(() => {
        deadlineExceeded = true;
        reject(deadlineError());
      }, EXPORT_DEADLINE_MS);
    });
    deadline.catch(() => {});

    await db.sequelize.query(`SET LOCAL statement_timeout = '${STATEMENT_TIMEOUT}'`, {
      transaction,
      type: QueryTypes.RAW,
    });
    await db.sequelize.query(
      `SET LOCAL idle_in_transaction_session_timeout = '${IDLE_IN_TRANSACTION_TIMEOUT}'`,
      { transaction, type: QueryTypes.RAW }
    );

    await setExportConfig(transaction, config);

    if (setup.trim()) {
      await db.sequelize.query(setup, { transaction, type: QueryTypes.RAW });
    }
    await db.sequelize.query(`DECLARE ${EXPORT_CURSOR} NO SCROLL CURSOR FOR ${finalSelect}`, {
      transaction,
      type: QueryTypes.RAW,
    });

    await onStart({ outputName });

    let firstBatch = true;
    for (;;) {
      if (deadlineExceeded) {
        throw deadlineError();
      }
      const rows = (await db.sequelize.query(
        `FETCH FORWARD ${FETCH_BATCH_SIZE} FROM ${EXPORT_CURSOR}`,
        { transaction, type: QueryTypes.SELECT }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      )) as Record<string, any>[];
      if (rows.length === 0) {
        break;
      }
      rowCount += rows.length;
      const chunk = stringify(rows, { header: firstBatch, quoted: true, quoted_empty: true });
      // UTF-8 BOM on the first chunk so Excel reads the CSV as UTF-8. Race the
      // deadline so a client parked on 'drain' (onChunk pending) can't hold the
      // connection past the deadline; a fast client is bounded by the loop-top
      // deadlineExceeded check instead.
      await Promise.race([onChunk(firstBatch ? `﻿${chunk}` : chunk), deadline]);
      firstBatch = false;
      if (rows.length < FETCH_BATCH_SIZE) {
        break;
      }
    }

    await db.sequelize.query(`CLOSE ${EXPORT_CURSOR}`, { transaction, type: QueryTypes.RAW });
    await transaction.commit();
  } catch (error) {
    if (transaction) {
      await transaction.rollback().catch(() => {});
    }
    throw error;
  } finally {
    if (deadlineTimer) {
      clearTimeout(deadlineTimer);
    }
    activeExports -= 1;
  }

  return { rowCount };
}
