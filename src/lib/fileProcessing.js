import { ExifTool } from 'exiftool-vendored';
import md5File from 'md5-file';
import sha256File from 'sha256-file';
import { auditLogger } from '../logger';

let et = null;

const isToolUp = async () => {
  if (et !== null && et !== undefined) {
    return et.ended === false;
  }
  return false;
};

const spinUpTool = async () => {
  try {
    if (!(await isToolUp())) {
      et = new ExifTool();
    }
    auditLogger.info(JSON.stringify({ exiftool: await et.version() }));
  } catch (err) {
    auditLogger.error(JSON.stringify({ message: 'Failed to spin-up exiftool', err }));
    throw err;
  }
  auditLogger.info('spin up exiftool');
};

const shutdownTool = async () => {
  try {
    if (await isToolUp()) {
      await et.end();
    }
    et = null;
  } catch (err) {
    auditLogger.error(JSON.stringify({ message: 'Failed to shutdown exiftool', err }));
    throw err;
  }
  auditLogger.info('shutdown exiftool');
};

const generateMetadataFromFile = async (path) => {
  const metadata = { path, value: null, error: [] };
  let needsCleanup = false;
  try {
    if (path === null
      || path === undefined
      || !(typeof path === 'string' || path instanceof String)
      || path === '') {
      metadata.error = 'invalid path';
      return metadata;
    }
    if (!(await isToolUp())) {
      await spinUpTool();
      needsCleanup = true;
    }
    metadata.value = await et.read(path, ['-json', '-g', '-P']);

    if ('errors' in metadata.value) {
      if (Array.isArray(metadata.value.errors)
      && metadata.value.errors.length !== 0) {
        metadata.error.concat(metadata.value.errors);
      }
      delete metadata.value.errors;
    }

    if ('Error' in metadata.value.ExifTool) {
      if (metadata.value.ExifTool.Error !== null
        && metadata.value.ExifTool.Error !== undefined) {
        metadata.error.push(metadata.value.ExifTool.Error);
      }
      delete metadata.value.ExifTool.Error;
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
        sha256: sha256File(path),
      };
    }

    if (Array.isArray(metadata.error) && metadata.error.length === 0) {
      metadata.error = null;
    }
  } catch (err) {
    auditLogger.error(JSON.stringify({ message: 'Failed to generate metadata from file', err }));
    metadata.error = err;
  } finally {
    if (needsCleanup) await shutdownTool();
  }

  auditLogger.info(JSON.stringify({ metadata }));
  return metadata;
};

export {
  spinUpTool,
  isToolUp,
  shutdownTool,
  generateMetadataFromFile,
};
