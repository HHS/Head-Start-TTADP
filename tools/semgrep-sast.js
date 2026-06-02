#!/usr/bin/env node

/* eslint-disable no-console */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');

const DEFAULT_SCAN_CONFIG_PATH = 'security/sast/scan-config.json';
const DEFAULT_ARTIFACTS_DIR = 'reports/semgrep';
const DEFAULT_RESULTS_PATH = `${DEFAULT_ARTIFACTS_DIR}/results.json`;
const DEFAULT_SUMMARY_PATH = `${DEFAULT_ARTIFACTS_DIR}/summary.json`;
const DEFAULT_PROVENANCE_PATH = `${DEFAULT_ARTIFACTS_DIR}/provenance.json`;
const DEFAULT_BASELINE_PATH = 'security/sast/baseline.json';
const DEFAULT_DISPOSITIONS_PATH = 'security/sast/dispositions.json';

const VALID_DISPOSITION_STATUSES = new Set([
  'accepted_risk',
  'deferred',
  'false_positive',
  'fixed',
  'not_applicable',
]);
const ACTIVE_DISPOSITION_STATUSES = new Set([
  'accepted_risk',
  'deferred',
  'false_positive',
  'not_applicable',
]);

function resolveProjectPath(relativePath, cwd = process.cwd()) {
  return path.resolve(cwd, relativePath);
}

function readJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function writeJson(jsonPath, data) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function pathExists(filePath) {
  return fs.existsSync(filePath);
}

function validateArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} must be an array`);
  }

  return value;
}

function loadScanConfig(scanConfigPath = DEFAULT_SCAN_CONFIG_PATH, cwd = process.cwd()) {
  const resolvedPath = resolveProjectPath(scanConfigPath, cwd);
  const scanConfig = readJson(resolvedPath);

  if (!scanConfig.semgrepVersion || typeof scanConfig.semgrepVersion !== 'string') {
    throw new Error(`Missing semgrepVersion in ${scanConfigPath}`);
  }

  validateArray(scanConfig.configs, `${scanConfigPath}:configs`);
  validateArray(scanConfig.include, `${scanConfigPath}:include`);
  validateArray(scanConfig.exclude, `${scanConfigPath}:exclude`);
  validateArray(scanConfig.blockingSeverities, `${scanConfigPath}:blockingSeverities`);

  if (typeof scanConfig.timeoutSeconds !== 'number' || scanConfig.timeoutSeconds <= 0) {
    throw new Error(`timeoutSeconds must be a positive number in ${scanConfigPath}`);
  }

  if (typeof scanConfig.timeoutThreshold !== 'number' || scanConfig.timeoutThreshold <= 0) {
    throw new Error(`timeoutThreshold must be a positive number in ${scanConfigPath}`);
  }

  return scanConfig;
}

function buildSemgrepArgs(scanConfig, outputDir = DEFAULT_ARTIFACTS_DIR, cwd = process.cwd()) {
  const resolvedOutputDir = resolveProjectPath(outputDir, cwd);
  const outputPaths = {
    text: path.join(resolvedOutputDir, 'results.txt'),
    json: path.join(resolvedOutputDir, 'results.json'),
    sarif: path.join(resolvedOutputDir, 'results.sarif'),
  };

  const args = [
    'scan',
    '--metrics=off',
    '--text',
    `--output=${outputPaths.text}`,
    `--json-output=${outputPaths.json}`,
    `--sarif-output=${outputPaths.sarif}`,
    `--timeout=${scanConfig.timeoutSeconds}`,
    `--timeout-threshold=${scanConfig.timeoutThreshold}`,
  ];

  scanConfig.configs.forEach((config) => {
    args.push('--config', config);
  });
  scanConfig.include.forEach((include) => {
    args.push('--include', include);
  });
  scanConfig.exclude.forEach((exclude) => {
    args.push('--exclude', exclude);
  });

  args.push('.');

  return {
    args,
    outputPaths,
  };
}

function runSemgrepScan({
  scanConfigPath = DEFAULT_SCAN_CONFIG_PATH,
  outputDir = DEFAULT_ARTIFACTS_DIR,
  semgrepBinary = 'semgrep',
  cwd = process.cwd(),
} = {}) {
  const scanConfig = loadScanConfig(scanConfigPath, cwd);
  const { args, outputPaths } = buildSemgrepArgs(scanConfig, outputDir, cwd);

  fs.mkdirSync(resolveProjectPath(outputDir, cwd), { recursive: true });

  const result = spawnSync(semgrepBinary, args, {
    cwd,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`Semgrep scan failed with exit code ${result.status}`);
  }

  return {
    outputPaths,
    scanConfig,
  };
}

function cleanSnippet(snippet = '') {
  return snippet.replace(/\r\n/g, '\n').trim();
}

function squashWhitespace(value = '') {
  return value.replace(/\s+/g, ' ').trim();
}

function pickFingerprint(result) {
  const fingerprint = result.extra?.fingerprint;
  if (fingerprint && typeof fingerprint === 'string') {
    return fingerprint;
  }

  return null;
}

function buildFindingKeySeed(result) {
  const fingerprint = pickFingerprint(result);
  const cleanedSnippet = cleanSnippet(result.extra?.lines || '');

  return JSON.stringify({
    checkId: result.check_id,
    path: result.path,
    fingerprint,
    snippet: squashWhitespace(cleanedSnippet),
    message: result.extra?.message || '',
  });
}

function compareRawSemgrepResults(left, right) {
  return (
    [
      buildFindingKeySeed(left).localeCompare(buildFindingKeySeed(right)),
      (left.path || '').localeCompare(right.path || ''),
      (left.start?.line || 0) - (right.start?.line || 0),
      (left.start?.col || 0) - (right.start?.col || 0),
      (left.end?.line || 0) - (right.end?.line || 0),
      (left.end?.col || 0) - (right.end?.col || 0),
    ].find((value) => value !== 0) || 0
  );
}

function assignFindingKeys(results) {
  const seenBaseKeys = new Map();

  return [...results].sort(compareRawSemgrepResults).map((result) => {
    const baseKey = buildFindingKeySeed(result);
    const occurrence = (seenBaseKeys.get(baseKey) || 0) + 1;
    seenBaseKeys.set(baseKey, occurrence);

    return {
      ...result,
      findingKey: crypto
        .createHash('sha256')
        .update(JSON.stringify({ baseKey, occurrence }))
        .digest('hex'),
      findingOccurrence: occurrence,
    };
  });
}

function createFindingSignature(result) {
  const signatureSource = result.findingKey || buildFindingKeySeed(result);

  return crypto.createHash('sha256').update(signatureSource).digest('hex');
}

function compareFindings(left, right) {
  return (
    [
      left.path.localeCompare(right.path),
      left.start.line - right.start.line,
      left.start.col - right.start.col,
      left.end.line - right.end.line,
      left.end.col - right.end.col,
      left.checkId.localeCompare(right.checkId),
      left.signature.localeCompare(right.signature),
    ].find((value) => value !== 0) || 0
  );
}

function mapSemgrepFinding(result) {
  return {
    signature: createFindingSignature(result),
    findingOccurrence: result.findingOccurrence || 1,
    checkId: result.check_id,
    path: result.path,
    start: result.start,
    end: result.end,
    severity: result.extra?.severity || 'INFO',
    message: result.extra?.message || '',
    snippet: cleanSnippet(result.extra?.lines || ''),
    metadata: {
      category: result.extra?.metadata?.category || null,
      confidence: result.extra?.metadata?.confidence || null,
      cwe: result.extra?.metadata?.cwe || [],
      owasp: result.extra?.metadata?.owasp || [],
      source: result.extra?.metadata?.source || null,
      shortlink: result.extra?.metadata?.shortlink || null,
      vulnerabilityClass: result.extra?.metadata?.vulnerability_class || [],
    },
  };
}

function collectSemgrepResults(scanResults) {
  const findings = assignFindingKeys(validateArray(scanResults.results || [], 'semgrep results'))
    .map(mapSemgrepFinding)
    .sort(compareFindings);

  const errors = validateArray(scanResults.errors || [], 'semgrep errors').map((error) => ({
    level: error.level || null,
    type: error.type || null,
    message: error.message || '',
    path: error.path || null,
    ruleId: error.rule_id || null,
  }));

  const skipped = validateArray(scanResults.paths?.skipped || [], 'semgrep skipped paths').map(
    (item) => ({
      path: item.path || null,
      reason: item.reason || item.message || 'unknown',
      details: item.details || item.message || '',
    })
  );

  return {
    semgrepVersion: scanResults.version || null,
    findings,
    errors,
    skipped,
  };
}

function summarizeScanCompleteness(scanResults) {
  const blockingErrors = scanResults.errors.filter((error) => error.level !== 'INFO');
  const skippedPaths = scanResults.skipped;

  return {
    errors: scanResults.errors,
    skipped: skippedPaths,
    blockingErrors,
    isComplete: blockingErrors.length === 0 && skippedPaths.length === 0,
  };
}

function assertCompleteScan(scanResults, contextLabel) {
  const completeness = summarizeScanCompleteness(scanResults);

  if (completeness.isComplete) {
    return completeness;
  }

  const issues = [
    ...completeness.blockingErrors.map(
      (error) => `scan error${error.path ? ` (${error.path})` : ''}: ${error.message}`
    ),
    ...completeness.skipped.map(
      (item) => `skipped path${item.path ? ` (${item.path})` : ''}: ${item.reason}`
    ),
  ];

  throw new Error(
    `${contextLabel} produced an incomplete Semgrep result:\n- ${issues.join('\n- ')}`
  );
}

function computeFileHash(filePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(filePath, 'utf8')).digest('hex');
}

function computeContentHash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function runGitCommand(args, cwd = process.cwd()) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    throw new Error(
      `Unable to run git ${args.join(' ')}: ${(result.stderr || result.stdout).trim()}`
    );
  }

  return result.stdout;
}

function getGitHeadSha(cwd = process.cwd()) {
  return runGitCommand(['rev-parse', 'HEAD'], cwd).trim();
}

function buildUntrackedEntry(relativePath, cwd = process.cwd()) {
  const resolvedPath = resolveProjectPath(relativePath, cwd);

  try {
    const stats = fs.lstatSync(resolvedPath);

    if (stats.isFile()) {
      return {
        path: relativePath,
        type: 'file',
        fingerprint: crypto
          .createHash('sha256')
          .update(fs.readFileSync(resolvedPath))
          .digest('hex'),
      };
    }

    if (stats.isSymbolicLink()) {
      return {
        path: relativePath,
        type: 'symlink',
        fingerprint: computeContentHash(fs.readlinkSync(resolvedPath, 'utf8')),
      };
    }

    return {
      path: relativePath,
      type: 'special',
      fingerprint: computeContentHash(
        JSON.stringify({
          mode: stats.mode,
          size: stats.size,
          kind: stats.isDirectory()
            ? 'directory'
            : stats.isFIFO()
              ? 'fifo'
              : stats.isSocket()
                ? 'socket'
                : stats.isCharacterDevice()
                  ? 'character-device'
                  : stats.isBlockDevice()
                    ? 'block-device'
                    : 'other',
        })
      ),
    };
  } catch (error) {
    return {
      path: relativePath,
      type: 'missing',
      fingerprint: computeContentHash(
        JSON.stringify({
          code: error.code || 'UNKNOWN',
          message: error.message,
        })
      ),
    };
  }
}

function collectGitWorktreeState(cwd = process.cwd(), { includeUntrackedEntries = false } = {}) {
  const statusPorcelain = runGitCommand(['status', '--porcelain', '--untracked-files=all'], cwd);
  const trackedDiff = runGitCommand(['diff', '--no-ext-diff', '--binary', 'HEAD'], cwd);
  const untrackedPathsOutput = runGitCommand(
    ['ls-files', '--others', '--exclude-standard', '-z'],
    cwd
  );
  const untrackedPaths = untrackedPathsOutput.split('\u0000').filter(Boolean);
  const untrackedEntries = untrackedPaths.map((relativePath) =>
    buildUntrackedEntry(relativePath, cwd)
  );

  const worktreeState = {
    isDirty: statusPorcelain.trim().length > 0,
    statusHash: computeContentHash(statusPorcelain),
    trackedDiffHash: computeContentHash(trackedDiff),
    untrackedFilesHash: computeContentHash(JSON.stringify(untrackedEntries)),
    untrackedFileCount: untrackedEntries.length,
  };

  if (includeUntrackedEntries) {
    worktreeState.untrackedEntries = untrackedEntries;
  }

  return worktreeState;
}

function createScanProvenance({
  scanConfigPath = DEFAULT_SCAN_CONFIG_PATH,
  generatedAt = new Date().toISOString(),
  includeUntrackedEntries = false,
  cwd = process.cwd(),
} = {}) {
  const resolvedScanConfigPath = resolveProjectPath(scanConfigPath, cwd);

  return {
    generatedAt,
    gitHeadSha: getGitHeadSha(cwd),
    gitWorktree: collectGitWorktreeState(cwd, { includeUntrackedEntries }),
    scanConfigPath,
    scanConfigHash: computeFileHash(resolvedScanConfigPath),
  };
}

function sanitizeProvenanceForCommit(provenance) {
  if (!provenance?.gitWorktree) {
    return provenance;
  }

  const { untrackedEntries, ...committedWorktree } = provenance.gitWorktree;

  return {
    ...provenance,
    gitWorktree: committedWorktree,
  };
}

function writeScanProvenance({
  provenancePath = DEFAULT_PROVENANCE_PATH,
  scanConfigPath = DEFAULT_SCAN_CONFIG_PATH,
  generatedAt = new Date().toISOString(),
  provenance,
  cwd = process.cwd(),
} = {}) {
  const scanProvenance =
    provenance ||
    createScanProvenance({
      scanConfigPath,
      generatedAt,
      cwd,
    });

  writeJson(resolveProjectPath(provenancePath, cwd), scanProvenance);

  return scanProvenance;
}

function createBaselineFromResults({
  resultsPath = DEFAULT_RESULTS_PATH,
  scanConfigPath = DEFAULT_SCAN_CONFIG_PATH,
  baselinePath = DEFAULT_BASELINE_PATH,
  provenance,
  generatedAt = new Date().toISOString(),
  cwd = process.cwd(),
} = {}) {
  const resolvedResultsPath = resolveProjectPath(resultsPath, cwd);
  const resolvedBaselinePath = resolveProjectPath(baselinePath, cwd);
  const scanResults = readJson(resolvedResultsPath);
  const scanConfig = loadScanConfig(scanConfigPath, cwd);
  const collectedResults = collectSemgrepResults(scanResults);
  const completeness = assertCompleteScan(collectedResults, 'Baseline generation');

  const baseline = {
    baselineDate: generatedAt.slice(0, 10),
    generatedAt,
    scanner: {
      name: 'semgrep',
      version: collectedResults.semgrepVersion || scanConfig.semgrepVersion,
      configs: scanConfig.configs,
      include: scanConfig.include,
      exclude: scanConfig.exclude,
      timeoutSeconds: scanConfig.timeoutSeconds,
      timeoutThreshold: scanConfig.timeoutThreshold,
      blockingSeverities: scanConfig.blockingSeverities,
    },
    provenance: provenance || null,
    scanCompleteness: completeness,
    findings: collectedResults.findings,
  };

  writeJson(resolvedBaselinePath, baseline);

  return baseline;
}

function buildDispositionTemplateEntry(finding, options = {}) {
  return {
    signature: finding.signature,
    checkId: finding.checkId,
    path: finding.path,
    start: finding.start,
    severity: finding.severity,
    status: options.status || 'deferred',
    rationale:
      options.rationale ||
      'Initial Semgrep rollout baseline finding pending remediation prioritization.',
    owner: options.owner || 'TTA Hub AppDev',
    reviewBy: options.reviewBy || new Date().toISOString().slice(0, 10),
    ticket: options.ticket || 'TTAHUB-5242',
    approvedBy: options.approvedBy || null,
    approvedOn: options.approvedOn || null,
  };
}

function createDispositionTemplate({
  baselinePath = DEFAULT_BASELINE_PATH,
  dispositionsPath = DEFAULT_DISPOSITIONS_PATH,
  status = 'deferred',
  rationale,
  owner,
  reviewBy,
  ticket,
  approvedBy,
  approvedOn,
  cwd = process.cwd(),
} = {}) {
  const resolvedBaselinePath = resolveProjectPath(baselinePath, cwd);
  const resolvedDispositionsPath = resolveProjectPath(dispositionsPath, cwd);
  const baseline = readJson(resolvedBaselinePath);
  const existingDispositions = pathExists(resolvedDispositionsPath)
    ? readJson(resolvedDispositionsPath)
    : { items: [] };
  const existingItems = new Map(
    validateArray(existingDispositions.items || [], 'existing dispositions.items')
      .filter((item) => item.signature)
      .map((item) => [item.signature, item])
  );

  const dispositionTemplate = {
    baselineDate: baseline.baselineDate,
    generatedAt: new Date().toISOString(),
    items: baseline.findings.map((finding) => {
      const scaffoldedItem = buildDispositionTemplateEntry(finding, {
        status,
        rationale,
        owner,
        reviewBy,
        ticket,
        approvedBy,
        approvedOn,
      });
      const existingItem = existingItems.get(finding.signature);

      if (!existingItem) {
        return scaffoldedItem;
      }

      return {
        ...existingItem,
        signature: scaffoldedItem.signature,
        checkId: scaffoldedItem.checkId,
        path: scaffoldedItem.path,
        start: scaffoldedItem.start,
        severity: scaffoldedItem.severity,
      };
    }),
  };

  writeJson(resolvedDispositionsPath, dispositionTemplate);

  return dispositionTemplate;
}

function validateDispositions(baseline, dispositions) {
  const issues = [];
  const baselineSignatures = new Set(baseline.findings.map((finding) => finding.signature));
  const seenSignatures = new Set();
  const items = validateArray(dispositions.items || [], 'dispositions.items');

  items.forEach((item) => {
    if (!item.signature) {
      issues.push('Disposition entries must include a signature');
      return;
    }

    if (seenSignatures.has(item.signature)) {
      issues.push(`Duplicate disposition signature: ${item.signature}`);
      return;
    }
    seenSignatures.add(item.signature);

    if (!baselineSignatures.has(item.signature)) {
      issues.push(`Disposition signature not found in baseline: ${item.signature}`);
    }

    if (!VALID_DISPOSITION_STATUSES.has(item.status)) {
      issues.push(`Invalid disposition status for ${item.signature}: ${item.status}`);
    }

    if (!item.rationale || typeof item.rationale !== 'string') {
      issues.push(`Missing disposition rationale for ${item.signature}`);
    }

    if (!item.owner || typeof item.owner !== 'string') {
      issues.push(`Missing disposition owner for ${item.signature}`);
    }

    if (!item.reviewBy || typeof item.reviewBy !== 'string') {
      issues.push(`Missing disposition reviewBy for ${item.signature}`);
    }
  });

  const missingDispositions = baseline.findings
    .filter((finding) => !seenSignatures.has(finding.signature))
    .map((finding) => finding.signature);

  return {
    issues,
    items,
    missingDispositions,
  };
}

function findingDescriptor(finding) {
  return `${finding.severity} ${finding.checkId} ${finding.path}:${finding.start.line}`;
}

function evaluateSemgrepResults({
  resultsPath = DEFAULT_RESULTS_PATH,
  baselinePath = DEFAULT_BASELINE_PATH,
  dispositionsPath = DEFAULT_DISPOSITIONS_PATH,
  scanConfigPath = DEFAULT_SCAN_CONFIG_PATH,
  cwd = process.cwd(),
} = {}) {
  const resolvedResultsPath = resolveProjectPath(resultsPath, cwd);
  const resolvedBaselinePath = resolveProjectPath(baselinePath, cwd);
  const resolvedDispositionsPath = resolveProjectPath(dispositionsPath, cwd);
  const collectedResults = collectSemgrepResults(readJson(resolvedResultsPath));
  const currentCompleteness = assertCompleteScan(collectedResults, 'SAST check');
  const baseline = readJson(resolvedBaselinePath);
  const dispositions = readJson(resolvedDispositionsPath);
  const scanConfig = loadScanConfig(scanConfigPath, cwd);
  const blockingSeverities = new Set(scanConfig.blockingSeverities);

  const baselineFindings = baseline.findings || [];
  const baselineMap = new Map(baselineFindings.map((finding) => [finding.signature, finding]));
  const currentMap = new Map(
    collectedResults.findings.map((finding) => [finding.signature, finding])
  );
  const dispositionValidation = validateDispositions(baseline, dispositions);
  const dispositionMap = new Map(dispositionValidation.items.map((item) => [item.signature, item]));

  const failures = [];
  const warnings = [];

  dispositionValidation.issues.forEach((issue) => {
    failures.push({
      type: 'invalid-disposition',
      message: issue,
    });
  });

  dispositionValidation.missingDispositions.forEach((signature) => {
    failures.push({
      type: 'missing-disposition',
      finding: baselineMap.get(signature),
      message: `Missing disposition for baseline finding ${signature}`,
    });
  });

  collectedResults.findings.forEach((finding) => {
    if (!baselineMap.has(finding.signature)) {
      if (blockingSeverities.has(finding.severity)) {
        failures.push({
          type: 'new-blocking-finding',
          finding,
          message: `New blocking finding: ${findingDescriptor(finding)}`,
        });
      } else {
        warnings.push({
          type: 'new-nonblocking-finding',
          finding,
          message: `New non-blocking finding: ${findingDescriptor(finding)}`,
        });
      }
      return;
    }

    const disposition = dispositionMap.get(finding.signature);
    if (!disposition) {
      return;
    }

    if (!ACTIVE_DISPOSITION_STATUSES.has(disposition.status)) {
      failures.push({
        type: 'invalid-active-disposition',
        finding,
        disposition,
        message: `Baseline finding still present but disposition is ${disposition.status}: ${findingDescriptor(finding)}`,
      });
    }
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    semgrepVersion: collectedResults.semgrepVersion,
    baselineDate: baseline.baselineDate,
    blockingSeverities: scanConfig.blockingSeverities,
    scanCompleteness: currentCompleteness,
    counts: {
      currentFindings: collectedResults.findings.length,
      baselineFindings: baselineFindings.length,
      missingDispositions: dispositionValidation.missingDispositions.length,
      newBlockingFindings: failures.filter((failure) => failure.type === 'new-blocking-finding')
        .length,
      newNonBlockingFindings: warnings.length,
      resolvedBaselineFindings: baselineFindings.filter(
        (finding) => !currentMap.has(finding.signature)
      ).length,
    },
    failures,
    warnings,
  };

  return summary;
}

function writeSummary(summaryPath, summary, cwd = process.cwd()) {
  writeJson(resolveProjectPath(summaryPath, cwd), summary);
}

function printSummary(summary) {
  console.log('Semgrep SAST summary');
  console.log(`- baseline date: ${summary.baselineDate}`);
  console.log(`- current findings: ${summary.counts.currentFindings}`);
  console.log(`- baseline findings: ${summary.counts.baselineFindings}`);
  console.log(`- resolved baseline findings: ${summary.counts.resolvedBaselineFindings}`);
  console.log(`- new blocking findings: ${summary.counts.newBlockingFindings}`);
  console.log(`- new non-blocking findings: ${summary.counts.newNonBlockingFindings}`);
  console.log(`- missing dispositions: ${summary.counts.missingDispositions}`);

  if (summary.failures.length > 0) {
    console.error('Semgrep SAST failures:');
    summary.failures.forEach((failure) => {
      console.error(`- ${failure.message}`);
    });
  }

  if (summary.warnings.length > 0) {
    console.log('Semgrep SAST warnings:');
    summary.warnings.forEach((warning) => {
      console.log(`- ${warning.message}`);
    });
  }
}

function generateBaselineFromFreshScan({
  scanConfigPath = DEFAULT_SCAN_CONFIG_PATH,
  outputDir = DEFAULT_ARTIFACTS_DIR,
  semgrepBinary = 'semgrep',
  baselinePath = DEFAULT_BASELINE_PATH,
  provenancePath = DEFAULT_PROVENANCE_PATH,
  generatedAt = new Date().toISOString(),
  cwd = process.cwd(),
} = {}) {
  const artifactProvenance = createScanProvenance({
    scanConfigPath,
    generatedAt,
    includeUntrackedEntries: true,
    cwd,
  });
  const { outputPaths } = runSemgrepScan({
    scanConfigPath,
    outputDir,
    semgrepBinary,
    cwd,
  });
  writeScanProvenance({
    provenancePath,
    provenance: artifactProvenance,
    cwd,
  });

  return createBaselineFromResults({
    resultsPath: path.relative(cwd, outputPaths.json),
    scanConfigPath,
    baselinePath,
    provenance: sanitizeProvenanceForCommit(artifactProvenance),
    generatedAt,
    cwd,
  });
}

function parseCliArguments(args = process.argv.slice(2)) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    options: {
      'scan-config': { type: 'string' },
      'output-dir': { type: 'string' },
      'semgrep-binary': { type: 'string' },
      results: { type: 'string' },
      baseline: { type: 'string' },
      dispositions: { type: 'string' },
      summary: { type: 'string' },
      'generated-at': { type: 'string' },
      status: { type: 'string' },
      rationale: { type: 'string' },
      owner: { type: 'string' },
      'review-by': { type: 'string' },
      ticket: { type: 'string' },
      'approved-by': { type: 'string' },
      'approved-on': { type: 'string' },
    },
  });

  return {
    command: positionals[0] || 'help',
    values,
  };
}

function printHelp() {
  console.log(`Usage:
  node tools/semgrep-sast.js scan
  node tools/semgrep-sast.js generate-baseline
  node tools/semgrep-sast.js seed-dispositions
  node tools/semgrep-sast.js check`);
}

function main() {
  const { command, values } = parseCliArguments();

  try {
    switch (command) {
      case 'scan': {
        const { outputPaths } = runSemgrepScan({
          scanConfigPath: values['scan-config'] || DEFAULT_SCAN_CONFIG_PATH,
          outputDir: values['output-dir'] || DEFAULT_ARTIFACTS_DIR,
          semgrepBinary: values['semgrep-binary'] || 'semgrep',
        });
        console.log(`Semgrep scan complete. JSON results written to ${outputPaths.json}`);
        return;
      }
      case 'generate-baseline': {
        const baseline = generateBaselineFromFreshScan({
          scanConfigPath: values['scan-config'] || DEFAULT_SCAN_CONFIG_PATH,
          outputDir: values['output-dir'] || DEFAULT_ARTIFACTS_DIR,
          semgrepBinary: values['semgrep-binary'] || 'semgrep',
          baselinePath: values.baseline || DEFAULT_BASELINE_PATH,
          generatedAt: values['generated-at'] || new Date().toISOString(),
        });
        console.log(`Baseline written with ${baseline.findings.length} findings`);
        return;
      }
      case 'seed-dispositions': {
        const dispositions = createDispositionTemplate({
          baselinePath: values.baseline || DEFAULT_BASELINE_PATH,
          dispositionsPath: values.dispositions || DEFAULT_DISPOSITIONS_PATH,
          status: values.status || 'deferred',
          rationale: values.rationale,
          owner: values.owner,
          reviewBy: values['review-by'],
          ticket: values.ticket,
          approvedBy: values['approved-by'],
          approvedOn: values['approved-on'],
        });
        console.log(`Disposition template written with ${dispositions.items.length} items`);
        return;
      }
      case 'check': {
        const summary = evaluateSemgrepResults({
          resultsPath: values.results || DEFAULT_RESULTS_PATH,
          baselinePath: values.baseline || DEFAULT_BASELINE_PATH,
          dispositionsPath: values.dispositions || DEFAULT_DISPOSITIONS_PATH,
          scanConfigPath: values['scan-config'] || DEFAULT_SCAN_CONFIG_PATH,
        });
        writeSummary(values.summary || DEFAULT_SUMMARY_PATH, summary);
        printSummary(summary);

        if (summary.failures.length > 0) {
          process.exit(1);
        }
        return;
      }
      default:
        printHelp();
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  ACTIVE_DISPOSITION_STATUSES,
  DEFAULT_ARTIFACTS_DIR,
  DEFAULT_BASELINE_PATH,
  DEFAULT_DISPOSITIONS_PATH,
  DEFAULT_PROVENANCE_PATH,
  DEFAULT_RESULTS_PATH,
  DEFAULT_SCAN_CONFIG_PATH,
  DEFAULT_SUMMARY_PATH,
  VALID_DISPOSITION_STATUSES,
  assertCompleteScan,
  assignFindingKeys,
  buildFindingKeySeed,
  buildDispositionTemplateEntry,
  buildSemgrepArgs,
  cleanSnippet,
  collectGitWorktreeState,
  compareFindings,
  computeFileHash,
  collectSemgrepResults,
  compareRawSemgrepResults,
  computeContentHash,
  createScanProvenance,
  createBaselineFromResults,
  createDispositionTemplate,
  createFindingSignature,
  evaluateSemgrepResults,
  generateBaselineFromFreshScan,
  getGitHeadSha,
  sanitizeProvenanceForCommit,
  loadScanConfig,
  mapSemgrepFinding,
  parseCliArguments,
  pickFingerprint,
  printSummary,
  resolveProjectPath,
  runSemgrepScan,
  summarizeScanCompleteness,
  validateDispositions,
  writeScanProvenance,
  writeJson,
  writeSummary,
};
