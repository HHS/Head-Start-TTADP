import { ExifTool } from 'exiftool-vendored';
import md5File from 'md5-file';
import sha256File from 'sha256-file';
import { auditLogger } from '../logger';

let exiftool = null;

const spinUpTool = async () => {
  if (exiftool === null || exiftool === undefined) {
    exiftool = new ExifTool({ taskTimeoutMillis: 5000 });
  }
  auditLogger.info(JSON.stringify({ exiftool: await exiftool.version() }));
};

const isToolUp = () => {
  if (exiftool !== null && exiftool !== undefined) {
    return exiftool.ended === false;
  }
  return false;
};

const shutdownTool = async () => {
  if (exiftool !== null && exiftool !== undefined) exiftool.end();
  exiftool = null;
};

const generateMetadataFromFile = async (path) => {
  const metadata = { value: null, error: [] };
  let needsCleanup = false;
  try {
    if (exiftool === null) {
      await spinUpTool();
      needsCleanup = true;
    }
    metadata.value = await exiftool.read(path, ['-json', '-g', '-P']);

    auditLogger.info(JSON.stringify(metadata));

    if ('errors' in metadata.value) {
      if (!Array.isArray(metadata.value.errors)
      || metadata.value.errors.length !== 0) {
        metadata.error.push(metadata.value.errors);
      }
      delete metadata.value.errors;
    }

    if ('Error' in metadata.value.ExifTool) {
      if (!Array.isArray(metadata.value.ExifTool.Error)
      || metadata.value.ExifTool.Error.length !== 0) {
        metadata.error.push(metadata.value.ExifTool.Error);
      }
      delete metadata.value.ExifTool.Error;
    }

    if (Array.isArray(metadata.error) && metadata.error.length === 0) {
      metadata.error = null;
    }

    if ('File' in metadata.value) {
      delete metadata.value.File;
    }
    if ('SourceFile' in metadata.value) {
      delete metadata.value.SourceFile;
    }
    if ('ExifTool' in metadata.value) {
      delete metadata.value.ExifTool;
    }

    if (metadata.error === null) {
      metadata.value.checksums = {
        md5: await md5File(path),
        sha256: await sha256File(path),
      };
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ message: 'Failed to generate metadata from file', err }));
    metadata.error = err;
  } finally {
    if (needsCleanup) await shutdownTool();
  }
  return metadata;
};

export {
  spinUpTool,
  isToolUp,
  shutdownTool,
  generateMetadataFromFile,
};
