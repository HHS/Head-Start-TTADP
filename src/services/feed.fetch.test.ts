/*
 * Real HTTP coverage for `fetchFeed`. The primary feed tests (feed.test.js)
 * mock `axios` to exercise the caching layer, so the actual network fetch is
 * otherwise untested. These tests run the real `fetchFeed` against a local
 * HTTP server (no network access).
 */
import http from 'http';
import { describe, it, beforeAll, afterAll, expect } from '@jest/globals';
import { fetchFeed } from './feed';

describe('fetchFeed (real HTTP)', () => {
  let server: http.Server;
  let baseUrl: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      if (req.url === '/feed') {
        res.writeHead(200, { 'Content-Type': 'application/rss+xml' });
        res.end('<rss>whats new</rss>');
        return;
      }
      if (req.url === '/redirect') {
        res.writeHead(302, { Location: '/feed' });
        res.end();
        return;
      }
      res.writeHead(404);
      res.end();
    });

    await new Promise<void>((resolve) => { server.listen(0, resolve); });
    const { port } = server.address() as { port: number };
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => { server.close(() => resolve()); });
  });

  it('returns the response body for the feed address', async () => {
    const data = await fetchFeed(`${baseUrl}/feed`);
    expect(data).toBe('<rss>whats new</rss>');
  });

  it('follows redirects to the final feed content', async () => {
    const data = await fetchFeed(`${baseUrl}/redirect`);
    expect(data).toBe('<rss>whats new</rss>');
  });
});
