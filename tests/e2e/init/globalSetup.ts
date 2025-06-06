import waitOn from 'wait-on';

async function globalSetup() {
  process.env.SEND_NOTIFICATIONS = '';

  // Wait for the reseed server to be up
  await waitOn({
    resources: ['http://localhost:9999/testingOnly/reseed'],
    timeout: 15000, // 15 seconds max
    interval: 250,
    headers: { accept: 'application/json' },
  });
}

export default globalSetup;
