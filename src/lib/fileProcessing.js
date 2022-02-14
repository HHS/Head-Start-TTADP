import exiftool from 'node-exiftool';
// import exiftoolBin from 'dist-exiftool';
import md5File from 'md5-file';
// import sha1File from 'sha1-file';
import sha256File from 'sha256-file';
import { auditLogger } from '../logger';

const exiftoolBin = require('@mcmics/dist-exiftool');

const generateMd5FromFile = async (path) => {
  const checksum = { type: 'md5', value: null, error: null };
  try {
    checksum.value = await md5File(path);
  } catch (err) {
    checksum.error = err;
  }
  return checksum;
};

// const generateSha1FromFile = async (path) => {
//   const checksum = { type: 'sha1', value: null, error: null };
//   try {
//     checksum.value = await sha1File(path);
//   } catch (err) {
//     checksum.error = err;
//   }
//   return checksum;
// };

const generateSha256FromFile = async (path) => {
  const checksum = { type: 'sha256', value: null, error: null };
  try {
    checksum.value = await sha256File(path);
  } catch (err) {
    checksum.error = err;
  }
  return checksum;
};

const generateMetadataFromFile = async (path) => {
  const metadata = { value: null, error: null };
  try {
    auditLogger.info(JSON.stringify(exiftoolBin));
    const ep = new exiftool.ExiftoolProcess(exiftoolBin);
    ep.open();
    metadata.value = ep.readMetadata(path, ['j', 'g']);
    ep.close();

    if ('SourceFile' in metadata) {
      delete metadata.SourceFile;
    }
    if ('ExifTool' in metadata) {
      delete metadata.ExifTool;
    }
  } catch (err) {
    metadata.error = err;
  }
  return metadata;
};

export {
  generateMd5FromFile,
  // generateSha1FromFile,
  generateSha256FromFile,
  generateMetadataFromFile,
};
