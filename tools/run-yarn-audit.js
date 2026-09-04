#!/usr/bin/env node

const { execSync } = require('child_process');
const { exit } = require('node:process');
const fs = require('fs');
const { validate } = require('uuid');
const path = require('path');

/* eslint-disable no-console */

const DEFAULT_GROUP = 'dependencies';
const ISSUE_FILES_BY_GROUP = {
  dependencies: 'yarn-audit-known-issues',
  devDependencies: 'yarn-audit-known-issues-dev',
  optionalDependencies: 'yarn-audit-known-issues-optional',
};
const SUPPORTED_GROUPS = new Set(Object.keys(ISSUE_FILES_BY_GROUP));

function auditCommand(group) {
  return `yarn audit --level low --json --groups ${group}`;
}

function parseArguments(args) {
  const options = {
    group: DEFAULT_GROUP,
    reportOnly: false,
  };

  args.forEach((arg, index) => {
    if (arg === '--report-only') {
      options.reportOnly = true;
      return;
    }
    if (arg.startsWith('--groups=')) {
      options.group = arg.replace('--groups=', '');
      return;
    }
    if (arg.startsWith('--group=')) {
      options.group = arg.replace('--group=', '');
      return;
    }
    if (arg === '--groups' || arg === '--group') {
      options.group = args[index + 1];
      return;
    }
    if (args[index - 1] === '--groups' || args[index - 1] === '--group') {
      return;
    }
    throw new Error(`Unsupported argument: ${arg}`);
  });

  if (!SUPPORTED_GROUPS.has(options.group)) {
    throw new Error(`Unsupported dependency group: ${options.group}. Use one of ${[...SUPPORTED_GROUPS].join(', ')}.`);
  }

  return options;
}

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

function validateKnownIssuesFile(issuesFile, createIfMissing = true) {
  if (!fs.existsSync(issuesFile)) {
    if (!createIfMissing) {
      return;
    }
    fs.writeFileSync(issuesFile, '');
    return;
  }
}

function getKnownIssues(issuesFile) {
  if (!fs.existsSync(issuesFile)) {
    return new Map();
  }
  const fileData = fs.readFileSync(issuesFile, 'utf8');
  return parseResult(fileData);
}

function getNewIssues(group) {
  let stdout = '';
  try {
    stdout = execSync(auditCommand(group)).toString();
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

function main(args = process.argv.slice(2)) {
  const { group, reportOnly } = parseArguments(args);
  const issuesFile = ISSUE_FILES_BY_GROUP[group];
  const command = auditCommand(group);
  console.log(`Checking ${group} for issues in "${path.basename(process.cwd())}/"`);
  validateKnownIssuesFile(issuesFile, !reportOnly);
  const newIssues = getNewIssues(group);
  const knownIssues = getKnownIssues(issuesFile);
  if (newIssues.size === 0) {
    console.info(`No issues found.`);
    exit(0);
  }
  console.log(`Found ${newIssues.size} current issues.`);
  console.info(`Skipping ${knownIssues.size} known issues (${[...knownIssues.keys()]})`);
  const unsolvedIssues = compareIssues(knownIssues, newIssues);
  console.info(`To update the ignore list, run '${command} > ${issuesFile}'`);
  console.info('---------------------');
  console.error(`Found ${unsolvedIssues.length} issues\n`);
  if (unsolvedIssues.length !== 0) {
    unsolvedIssues.forEach((issue) => {
      const chunkOne =
        `${issue.data.advisory.module_name}@${issue.data.advisory.findings[0].version} to ${issue.data.advisory.patched_versions}`.padEnd(
          50,
          ' '
        );
      const chunkTwo = `(${issue.data.advisory.severity}) ${JSON.stringify(issue.data.advisory.findings)}`;
      console.info(`${chunkOne} ${chunkTwo}`);
    });
    exit(reportOnly ? 0 : 1);
  }
}

if (require.main === module) {
  main();
}
