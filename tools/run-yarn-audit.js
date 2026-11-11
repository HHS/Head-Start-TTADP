#!/usr/bin/env node

// Fails when `yarn npm audit` reports an advisory that is not listed in the package's
// `yarn-audit-known-issues` file. Run from the package root (repository root or `frontend/`).

const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const {
  YARN_NPM_AUDIT_ARGS,
  YARN_NPM_AUDIT_COMMAND,
  advisoryKey,
  parseYarnNpmAudit,
} = require('./security-findings/yarn-npm-audit');

/* eslint-disable no-console */

const ISSUES_FILE = 'yarn-audit-known-issues';

// Map of advisoryKey -> { advisory, version }, one entry per advisory and installed version.
function indexAdvisories(advisories) {
  const findings = new Map();
  advisories.forEach((advisory) => {
    advisory.versions.forEach((version) => {
      const key = advisoryKey(advisory, version);
      if (!findings.has(key)) {
        findings.set(key, { advisory, version });
      }
    });
  });
  return findings;
}

function readKnownIssues(issuesFile = ISSUES_FILE) {
  if (!fs.existsSync(issuesFile)) {
    fs.writeFileSync(issuesFile, '');
  }
  return indexAdvisories(parseYarnNpmAudit(fs.readFileSync(issuesFile, 'utf8')));
}

// Yarn exits 1 both when it finds advisories and when the audit itself fails (registry outage,
// auth error). Only trust a non-zero exit when the output contains advisory rows.
function runAudit(spawn = spawnSync) {
  const result = spawn('yarn', YARN_NPM_AUDIT_ARGS, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    throw new Error(`Unable to run "${YARN_NPM_AUDIT_COMMAND}": ${result.error.message}`);
  }

  let advisories;
  try {
    advisories = parseYarnNpmAudit(result.stdout);
  } catch (error) {
    throw new Error(`${error.message}\n${result.stdout || ''}${result.stderr || ''}`);
  }

  if (result.status !== 0 && advisories.length === 0) {
    throw new Error(
      `"${YARN_NPM_AUDIT_COMMAND}" exited with status ${result.status} without reporting advisories:\n${result.stdout || ''}${result.stderr || ''}`
    );
  }

  return indexAdvisories(advisories);
}

function findUnknownIssues(knownIssues, currentIssues) {
  return [...currentIssues.entries()]
    .filter(([key]) => !knownIssues.has(key))
    .map(([, finding]) => finding);
}

function formatIssue({ advisory, version }) {
  const id = advisory.ghsa || advisory.advisoryId;
  const subject = `${advisory.module}@${version} (${advisory.severity}) ${id}`.padEnd(60, ' ');
  const via = advisory.dependents.length ? ` via ${advisory.dependents.join(', ')}` : '';
  return `${subject} vulnerable: ${advisory.vulnerableVersions}${via}\n    ${advisory.title} ${advisory.url || ''}`.trimEnd();
}

function main({ spawn = spawnSync, issuesFile = ISSUES_FILE } = {}) {
  console.log(`Checking for issues in "${path.basename(process.cwd())}/"`);
  const currentIssues = runAudit(spawn);
  const knownIssues = readKnownIssues(issuesFile);

  if (currentIssues.size === 0) {
    console.info('No issues found.');
    return 0;
  }

  console.log(`Found ${currentIssues.size} current issues.`);
  console.info(`Skipping ${knownIssues.size} known issues (${[...knownIssues.keys()].join(', ')})`);
  const unknownIssues = findUnknownIssues(knownIssues, currentIssues);
  console.info(`To update the ignore list, run '${YARN_NPM_AUDIT_COMMAND} > ${issuesFile}'`);
  console.info('---------------------');
  console.error(`Found ${unknownIssues.length} issues\n`);
  unknownIssues.forEach((issue) => {
    console.info(formatIssue(issue));
  });
  return unknownIssues.length === 0 ? 0 : 1;
}

if (require.main === module) {
  try {
    process.exitCode = main();
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = {
  ISSUES_FILE,
  findUnknownIssues,
  formatIssue,
  indexAdvisories,
  main,
  readKnownIssues,
  runAudit,
};
