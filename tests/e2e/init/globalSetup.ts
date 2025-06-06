import { spawn } from 'child_process';
import waitOn from 'wait-on';

let serverProcess: ReturnType<typeof spawn>;

async function globalSetup() {
  process.env.SEND_NOTIFICATIONS = '';

  // Start test server
  serverProcess = spawn('node', ['src/testingOnly.js'], {
    stdio: 'inherit', // show logs
    env: { ...process.env, NODE_ENV: 'test' },
  });

  // Wait until /testingOnly/reseed is ready
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
