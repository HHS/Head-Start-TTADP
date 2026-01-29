#!/usr/bin/env node

const { execSync } = require('child_process');
const { exit } = require('node:process');
const fs = require('fs');

/* eslint-disable no-console */

const ISSUES_FILE = 'yarn-audit-known-issues';
const AUDIT_CMD = 'yarn audit --level low --json --groups dependencies';

function parseResult(rawData) {
  const findings = new Map();
  rawData.split(/\r?\n/).forEach((line) => {
    if (line) {
      try {
        const result = JSON.parse(line);
        if (result.type !== 'auditAdvisory') {
          return;
        }
        const module = result.data.advisory.module_name;
        const { version } = result.data.advisory.findings[0];
        const key = `${module}@${version}`;
        if (findings.has(key)) {
          return;
        }
        findings.set(key, result);
      } catch (err) {
        console.error(err);
      }
    }
  });
  return findings;
}

function getKnownIssues() {
  const fileData = fs.readFileSync(ISSUES_FILE, 'utf8');
  return parseResult(fileData);
}

function getNewIssues() {
  let stdout = '';
  try {
    stdout = execSync(AUDIT_CMD).toString();
  } catch (err) {
    // yarn returns non-zero exit code on findings
    stdout = err.stdout.toString();
  }
  return parseResult(stdout);
}

function compareIssues(knownIssues, newIssues) {
  const issues = [];
  newIssues.forEach((value, key) => {
    if (!knownIssues.has(key)) {
      issues.push(value);
    }
  });
  return issues;
}

function main() {
  const newIssues = getNewIssues();
  const knownIssues = getKnownIssues();
  if (newIssues.size === 0) {
    console.info('No issues found.');
    exit(0);
  }
  console.log(`Found ${newIssues.size} current issues.`);
  console.info(`Skipping ${knownIssues.size} known issues (${[...knownIssues.keys()]})`);
  const unsolvedIssues = compareIssues(knownIssues, newIssues);
  console.info(`To update the ignore list, run '${AUDIT_CMD} > ${ISSUES_FILE}'`);
  console.info('---------------------');
  console.error(`Found ${unsolvedIssues.length} issues\n`);
  if (unsolvedIssues.length !== 0) {
    unsolvedIssues.forEach((issue) => {
      const chunkOne = `${issue.data.advisory.module_name}@${issue.data.advisory.findings[0].version} to ${issue.data.advisory.patched_versions}`.padEnd(50, ' ');
      const chunkTwo = `(${issue.data.advisory.severity}) ${JSON.stringify(issue.data.advisory.findings)}`;
      console.info(`${chunkOne} ${chunkTwo}`);
    });
    exit(1);
  }
}

if (require.main === module) {
  main();
}
