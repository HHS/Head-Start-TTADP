const http = require('node:http');
const { createRequire } = require('node:module');
const path = require('node:path');

const frontendRequire = createRequire(path.resolve(__dirname, '../frontend/package.json'));
const clients = [
  ['backend', require('follow-redirects').http],
  ['frontend', frontendRequire('follow-redirects').http],
];

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.removeListener('error', reject);
      resolve(`http://127.0.0.1:${server.address().port}`);
    });
  });
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

function getHeaders(client, url, headers) {
  return new Promise((resolve, reject) => {
    client
      .get(url, { headers, sensitiveHeaders: ['X-API|Key'], timeout: 5000 }, (response) => {
        if (response.statusCode !== 200) {
          response.resume();
          reject(new Error(`Unexpected response status: ${response.statusCode}`));
          return;
        }
        let body = '';
        response.setEncoding('utf8');
        response.on('data', (chunk) => {
          body += chunk;
        });
        response.on('error', reject);
        response.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject)
      .on('timeout', function onTimeout() {
        this.destroy(new Error('Redirect request timed out'));
      });
  });
}

describe.each(clients)('%s redirect credential handling', (_graph, client) => {
  let origin;
  let destination;
  let originUrl;

  beforeAll(async () => {
    const echoHeaders = (req, res) => res.end(JSON.stringify(req.headers));
    destination = http.createServer(echoHeaders);
    const destinationUrl = await listen(destination);
    origin = http.createServer((req, res) => {
      if (req.url === '/echo') {
        echoHeaders(req, res);
        return;
      }
      res.writeHead(302, {
        Location: req.url === '/same-origin' ? '/echo' : `${destinationUrl}/echo`,
      });
      res.end();
    });
    originUrl = await listen(origin);
  });

  afterAll(async () => {
    await Promise.all([close(origin), close(destination)]);
  });

  describe.each(['object', 'array'])('%s headers', (format) => {
    const credentials = {
      Authorization: 'test-authorization',
      'Proxy-Authorization': 'test-proxy-authorization',
      Cookie: 'session=test-session',
      'X-API|Key': 'test-api-key',
      'X-Public': 'public-value',
    };
    const headers = () => {
      const values = { Host: new URL(originUrl).host, ...credentials };
      return format === 'array' ? Object.entries(values).flat() : values;
    };

    it('preserves credentials on same-origin redirects', async () => {
      const received = await getHeaders(client, `${originUrl}/same-origin`, headers());
      for (const [name, value] of Object.entries(credentials)) {
        expect(received[name.toLowerCase()]).toBe(value);
      }
    });

    it('strips built-in and declared credentials on cross-origin redirects', async () => {
      const received = await getHeaders(client, `${originUrl}/cross-origin`, headers());
      for (const name of ['Authorization', 'Proxy-Authorization', 'Cookie', 'X-API|Key']) {
        expect(received).not.toHaveProperty(name.toLowerCase());
      }
      expect(received['x-public']).toBe('public-value');
    });
  });
});
