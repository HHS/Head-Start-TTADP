/* eslint-disable import/prefer-default-export */
import fs from 'fs';
import crypto from 'crypto';

export function fileHash(filepath) {
  const fileBuffer = fs.readFileSync(filepath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}
