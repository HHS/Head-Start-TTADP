/* eslint-disable import/prefer-default-export */
import fs from 'fs';
import crypto from 'crypto';

export function fileHash(filepath) {
  let hash = null;
  if (fs.existsSync(filepath)) {
    const fileBuffer = fs.readFileSync(filepath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    hash = hashSum.digest('hex');
  }
  return hash;
}
