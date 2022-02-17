import { ExifTool } from 'exiftool-vendored';
import md5File from 'md5-file';
import sha256File from 'sha256-file';
import { auditLogger } from '../logger';

const exiftool = new ExifTool({ taskTimeoutMillis: 5000 });

const generateMetadataFromFile = async (path) => {
  let metadata = { value: null, error: null };
  try {
    metadata.value = await exiftool.read(path,['-g', '-P']);
    metadata.value.checksums = {
      md5: await md5File(path),
      sha256: await sha256File(path),
    };

    if ('errors' in metadata.value) {
      metadata.error = metadata.value.errors;
      delete metadata.value.errors;
      if (Array.isArray(metadata.error) && metadata.error.length == 0) {
        metadata.error = null;
      }
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
  } catch (err) {
    auditLogger.error('Something terrible happened: ', err);
    metadata.error = err;
  }
  return metadata;
};

export {
  generateMetadataFromFile,
};
