/*
 * Covers the file-download and archive-extraction I/O used by the HSES grant
 * import. The primary `updateGrantsRecipients` unit tests mock `axios` and
 * `adm-zip`, so the real streaming download and zip extraction are otherwise
 * untested. These tests exercise the real libraries against a local HTTP
 * server and temp files (no network access).
 */
import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import AdmZip from 'adm-zip';
import axios from 'axios';

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
      new AdmZip(zipPath).extractAllTo(outDir, true);

      expect(fs.readFileSync(path.join(outDir, 'grants.xml'), 'utf8'))
        .toBe('<grants>one</grants>');
      expect(fs.readFileSync(path.join(outDir, 'nested', 'recipients.xml'), 'utf8'))
        .toBe('<recipients>two</recipients>');
    });

    it('overwrites previously extracted files on a subsequent import', () => {
      const zipPath = path.join(tmpDir, 'hses.zip');
      const outDir = path.join(tmpDir, 'temp');

      const first = new AdmZip();
      first.addFile('grants.xml', Buffer.from('first', 'utf8'));
      first.writeZip(zipPath);
      new AdmZip(zipPath).extractAllTo(outDir, true);
      expect(fs.readFileSync(path.join(outDir, 'grants.xml'), 'utf8')).toBe('first');

      const second = new AdmZip();
      second.addFile('grants.xml', Buffer.from('second', 'utf8'));
      second.writeZip(zipPath);
      new AdmZip(zipPath).extractAllTo(outDir, true);
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
      await new Promise((resolve) => { server.listen(0, resolve); });
      const { port } = server.address();
      baseUrl = `http://127.0.0.1:${port}`;
    });

    afterEach(async () => {
      await new Promise((resolve) => server.close(resolve));
    });

    it('streams an authenticated response and pipes it to disk', async () => {
      const destination = path.join(tmpDir, 'hses.zip');
      const { status, data } = await axios(baseUrl, {
        method: 'get',
        responseType: 'stream',
        auth: { username: 'hses', password: 'secret' },
      });

      expect(status).toBe(200);

      await new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(destination);
        writeStream.on('close', resolve);
        writeStream.on('error', reject);
        data.pipe(writeStream);
      });

      expect(fs.readFileSync(destination, 'utf8')).toBe('zip-bytes');
    });

    it('rejects when credentials are not provided', async () => {
      await expect(axios(baseUrl, { method: 'get', responseType: 'stream' }))
        .rejects.toThrow();
    });
  });
});
