const fs = require('fs');
const path = require('path');

/* eslint-disable no-console */

// Helper to load current status
function loadStatus(statusFile) {
  if (!fs.existsSync(statusFile)) {
    return {};
  }
  const data = fs.readFileSync(statusFile, 'utf8');
  try {
    return JSON.parse(data);
  } catch (e) {
    console.error('Error parsing status file:', e);
    return {};
  }
}

// Helper to save status
function saveStatus(status, statusFile) {
  fs.writeFileSync(statusFile, JSON.stringify(status, null, 2), 'utf8');
}

// Parse command line arguments
const [,, environment, username, branch, statusFile] = process.argv;

if (!environment || !username || !branch || !statusFile) {
  console.error('Usage: node write_envs.js <environment> <username> <branch> <status_file>');
  process.exit(1);
}

const status = loadStatus(statusFile);

// Check if update is needed
const prev = status[environment];
status[environment] = { username, branch, updated: new Date().toLocaleDateString('en-US', { timeZone: 'EST' }) };
saveStatus(status, statusFile);
console.log(loadStatus(statusFile));
