const path = require('path');
const { spawn } = require('child_process');
const waitOn = require('wait-on');

let serverProcess;

async function globalSetup() {
  process.env.SEND_NOTIFICATIONS = '';

  const scriptPath = path.resolve(__dirname, '../../src/testingOnly.js');

  serverProcess = spawn('node', [scriptPath], {
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'test' },
  });

  await new Promise<void>((resolve, reject) => {
    waitOn(
      {
        resources: ['http://localhost:9999/testingOnly/reseed'],
        timeout: 20000,
      },
      (err) => {
        if (err) {
          console.error('Timed out waiting for testing server');
          reject(err);
        } else {
          console.log('Testing server is up!');
          resolve();
        }
      }
    );
  });
}

export default globalSetup;
