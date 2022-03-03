import { ExifTool } from 'exiftool-vendored';
import md5File from 'md5-file';
import sha256File from 'sha256-file';
import { auditLogger } from '../logger';

let et = null;

const isToolUp = () => {
  if (et !== null && et !== undefined) {
    return et.ended === false;
  }
  return false;
};

const spinUpTool = async () => {
  if (!isToolUp()) {
    et = new ExifTool({ taskTimeoutMillis: 5000 });
  }
  auditLogger.info(JSON.stringify({ exiftool: await et.version() }));
};

const shutdownTool = async () => {
  if (isToolUp()) {
    et.end();
  }
  et = null;
};

const generateMetadataFromFile = async (path) => {
  const metadata = { value: null, error: [] };
  let needsCleanup = false;
  try {
    if (!isToolUp()) {
      await spinUpTool();
      needsCleanup = true;
    }
    metadata.value = await et.read(path, ['-json', '-g', '-P']);
    // metadata.value = await et.readRaw(path, ['-json', '-g', '-P']);

    auditLogger.info(JSON.stringify({ metadata }));

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
        sha256: sha256File(path),
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
