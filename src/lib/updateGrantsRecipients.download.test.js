/*
 * Covers the file-download and archive-extraction I/O used by the HSES grant
 * import. The primary `updateGrantsRecipients` unit tests mock `axios` and
 * `adm-zip`, so the real streaming download and zip extraction are otherwise
 * untested. These tests exercise the actual project helpers (`downloadHsesFile`
 * and `extractHsesZip`) against a local HTTP server and temp files (no network
 * access).
 */

import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { downloadHsesFile, extractHsesZip } from './updateGrantsRecipients';

describe('HSES grant import file handling', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hses-import-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('archive extraction', () => {
    it('extracts flat and nested entries to the target directory', () => {
      const zipPath = path.join(tmpDir, 'hses.zip');
      const zip = new AdmZip();
      zip.addFile('grants.xml', Buffer.from('<grants>one</grants>', 'utf8'));
      zip.addFile('nested/recipients.xml', Buffer.from('<recipients>two</recipients>', 'utf8'));
      zip.writeZip(zipPath);

      const outDir = path.join(tmpDir, 'temp');
      extractHsesZip(zipPath, outDir);

      expect(fs.readFileSync(path.join(outDir, 'grants.xml'), 'utf8')).toBe('<grants>one</grants>');
      expect(fs.readFileSync(path.join(outDir, 'nested', 'recipients.xml'), 'utf8')).toBe(
        '<recipients>two</recipients>'
      );
    });

    it('overwrites previously extracted files on a subsequent import', () => {
      const zipPath = path.join(tmpDir, 'hses.zip');
      const outDir = path.join(tmpDir, 'temp');

      const first = new AdmZip();
      first.addFile('grants.xml', Buffer.from('first', 'utf8'));
      first.writeZip(zipPath);
      extractHsesZip(zipPath, outDir);
      expect(fs.readFileSync(path.join(outDir, 'grants.xml'), 'utf8')).toBe('first');

      const second = new AdmZip();
      second.addFile('grants.xml', Buffer.from('second', 'utf8'));
      second.writeZip(zipPath);
      extractHsesZip(zipPath, outDir);
      expect(fs.readFileSync(path.join(outDir, 'grants.xml'), 'utf8')).toBe('second');
    });
  });

  describe('streaming download', () => {
    let server;
    let baseUrl;

    beforeEach(async () => {
      server = http.createServer((req, res) => {
        // Mirror HSES requiring basic auth on the data file endpoint.
        if (!req.headers.authorization) {
          res.writeHead(401);
          res.end();
          return;
        }
        res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
        res.end('zip-bytes');
      });
      await new Promise((resolve) => {
        server.listen(0, resolve);
      });
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
    });

    afterEach(async () => {
      await new Promise((resolve) => server.close(resolve));
    });

    it('streams an authenticated response and pipes it to disk', async () => {
      const destination = path.join(tmpDir, 'hses.zip');
      await downloadHsesFile(baseUrl, destination, { username: 'hses', password: 'secret' });
      expect(fs.readFileSync(destination, 'utf8')).toBe('zip-bytes');
    });

    it('rejects when credentials are not provided', async () => {
      await expect(downloadHsesFile(baseUrl, path.join(tmpDir, 'out.zip'))).rejects.toThrow();
    });
  });
});
