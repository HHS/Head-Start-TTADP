import { Pool, PoolClient } from 'pg';
import * as pgp from 'pg-promise';
import * as zlib from 'zlib';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import fs, { createWriteStream, createReadStream } from 'fs';
import { pipeline, PassThrough } from 'stream';
import { promisify } from 'util';
import { uploadFile } from '../s3';
import configs from '../../../config/config';
import { DBMaintenanceFile } from '../../models';
const { DB_MAINTENANCE_TYPE, FILE_STATUSES } = require('../constants');

const env = process.env.NODE_ENV || 'development';
const defaultConfig = configs[env];

const passwordPrefix = process.env.DB_BACKUP_PASSWORD_PREFIX;

const pipelineAsync = promisify(pipeline);

interface ConnectionOptions {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
}

class DBMaintenance {
  private pool: Pool;

  constructor() {
    this.pool = new Pool();
  }

  async dump(
    encryptionPassword = `${passwordPrefix}${new Date().toISOString().slice(0, 10)}`,
    connectionOptions: ConnectionOptions = defaultConfig,
    dumpFilePath = '/tmp/',
  ): Promise<void> {
    const key = `${uuidv4()}.gz`;
    const connectionString = this.buildConnectionString(connectionOptions);

    const dumpStream = createWriteStream(dumpFilePath);
    const gzipStream = zlib.createGzip({ level: zlib.constants.Z_BEST_COMPRESSION });
    const encryptStream = crypto.createCipheriv('aes-256-cbc', encryptionPassword, Buffer.alloc(16));
    const s3Stream = new PassThrough();

    const client: PoolClient = await this.pool.connect(); // Acquire a connection from the pool
    // Use the connection for the pg_dump command
    const pgDumpProcess = client.query(pgp.pg_dump(connectionString));

    const pgDumpStream = pgDumpProcess.stream();

    await pipelineAsync(pgDumpStream, gzipStream, encryptStream, dumpStream, s3Stream);

    pgDumpProcess.release(); // Release the connection back to the pool

    // Get the size of the dumped file
    const { size: fileSize } = await fs.promises.stat(dumpFilePath);

    uploadFile(s3Stream, key, { ext: 'gz', mime: 'application/gzip' });

    await DBMaintenanceFile.create({
      type: DB_MAINTENANCE_TYPE.BACKUP,
      password: encryptionPassword,
      file: {
        originalFileName: '',
        key,
        status: FILE_STATUSES.UPLOADED,
        fileSize,
      },
    });

    // Cleanup: Delete the local dump file
    await fs.promises.unlink(dumpFilePath);
  }

  async restore(
    encryptionPassword: string,
    connectionOptions: ConnectionOptions,
    dumpFilePath: string,
): Promise<void> {
    const connectionString = this.buildConnectionString(connectionOptions);

    const dumpStream = createReadStream(dumpFilePath);
    const decryptStream = crypto.createDecipheriv('aes-256-cbc', encryptionPassword, Buffer.alloc(16));
    const gunzipStream = zlib.createGunzip();

    const client: PoolClient = await this.pool.connect(); // Acquire a connection from the pool
    // Use the connection for the pg_dump command
    const pgRestoreProcess = client.query(pgp.pg_restore(connectionString));

    const pgRestoreStream = pgRestoreProcess.stream();

    await pipelineAsync(dumpStream, decryptStream, gunzipStream, pgRestoreStream);

    pgRestoreProcess.release(); // Release the connection back to the pool
  }

  private buildConnectionString(options: ConnectionOptions): string {
    return `postgres://${options.user}:${options.password}@${options.host}:${options.port}/${options.database}`;
  }
}

export default DBMaintenance;
