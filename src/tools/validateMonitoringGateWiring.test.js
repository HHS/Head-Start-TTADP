import fs from 'fs';
import yaml from 'js-yaml';
import path from 'path';

// The gate CLI reads process.env.MONITORING_GATE_HALT_CHECKS inside a cf run-task,
// so enforcement only works if the var is exposed through the app environment -
// declared in manifest.yml and provided per environment in deployment_config,
// the same wiring as ENABLE_MONITORING_GOAL_CREATION. These tests guard that
// wiring so it can't silently regress to always-report-only. See
// docs/monitoring-data-validation.md ("Enforcement controls").
const repoRoot = path.resolve(__dirname, '../..');
const readFile = (relativePath) => fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('monitoring gate enforcement wiring', () => {
  it('exposes MONITORING_GATE_HALT_CHECKS in the app environment (manifest.yml)', () => {
    const manifest = yaml.load(readFile('manifest.yml'));
    const { env } = manifest.applications[0];
    expect(env).toHaveProperty('MONITORING_GATE_HALT_CHECKS', '((MONITORING_GATE_HALT_CHECKS))');
  });

  // Text check rather than yaml.load: the vars files carry envsubst placeholders
  // and (pre-existing) duplicate keys that a strict YAML parse rejects.
  it.each([
    'prod',
    'dev',
    'staging',
  ])('provides MONITORING_GATE_HALT_CHECKS in deployment_config/%s_vars.yml', (envName) => {
    const contents = readFile(`deployment_config/${envName}_vars.yml`);
    expect(contents).toMatch(/^MONITORING_GATE_HALT_CHECKS:\s*\S/m);
  });
});
