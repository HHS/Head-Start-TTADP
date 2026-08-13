#!/usr/bin/env node

/* eslint-disable no-console */
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { parseArgs } = require('node:util');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const DEFAULT_INVENTORY_PATH = 'release/inventory.json';
const DEFAULT_DISPOSITIONS_PATH = 'release/inventoryDispositions.json';
const DEFAULT_INVENTORY_SCHEMA_PATH = 'release/inventorySchema.json';
const DEFAULT_DISPOSITIONS_SCHEMA_PATH = 'release/inventoryDispositionsSchema.json';
const DEFAULT_ARTIFACTS_DIR = 'release-artifacts';
const DEFAULT_RECONCILIATION_PATH = `${DEFAULT_ARTIFACTS_DIR}/inventoryReconciliation.json`;
const DEFAULT_CMS_EXPORT_PATH = `${DEFAULT_ARTIFACTS_DIR}/cmsApprovedCiVersions.json`;
const DEFAULT_CMS_CSV_EXPORT_PATH = `${DEFAULT_ARTIFACTS_DIR}/cmsApprovedCiVersions.csv`;

const REPOSITORY_LOCATOR_TYPES = new Set(['repositoryFile']);
const SPACE_LOCATOR_TYPES = new Set([
  'cloudFoundryApp',
  'cloudFoundryProcess',
  'cloudFoundryService',
  'cloudFoundryRoute',
  'cloudFoundryStack',
  'cloudFoundryBuildpack',
]);

const ACTIVE_DISPOSITION_STATUSES = new Set(['accepted', 'deferred']);

function readJson(jsonPath) {
  return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
}

function writeJson(jsonPath, data) {
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function hashContent(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

/**
 * Structural validation against a committed JSON Schema. This is audit
 * evidence, so a malformed entry must surface as a finding rather than
 * silently falling out of selectDeclared()/reconcile() comparisons.
 */
function schemaErrors(schema, data, label) {
  const ajv = new Ajv({ allErrors: true, strict: false, logger: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  if (validate(data)) {
    return [];
  }

  return validate.errors.map(
    (error) => `${label} schema: ${error.instancePath || '/'} ${error.message}`
  );
}

/**
 * Replaces the ((env)) token the cloud.gov manifest uses so a single declared
 * entry can describe every environment.
 */
function substituteEnv(value, environment) {
  return String(value).replace(/\(\(env\)\)/g, environment);
}

/**
 * Reconciliation identity. Deliberately excludes anything that changes between
 * deploys, such as GUIDs, instance counts, or droplet timestamps, so an
 * ordinary redeploy does not read as drift.
 */
function componentIdentity(componentClass, name, environment) {
  return `${componentClass}:${substituteEnv(name, environment)}`;
}

function declaredIdentity(component, environment) {
  return componentIdentity(component.class, component.name, environment);
}

function isRepositoryScoped(component) {
  return REPOSITORY_LOCATOR_TYPES.has(component.locator.type);
}

function isSpaceScoped(component) {
  return SPACE_LOCATOR_TYPES.has(component.locator.type);
}

function selectDeclared(inventory, scope) {
  const reconciled = inventory.components.filter((c) => c.tier === 'reconciled');

  if (scope === 'repository') {
    return reconciled.filter(isRepositoryScoped);
  }

  if (scope === 'space') {
    return reconciled.filter(isSpaceScoped);
  }

  return reconciled.filter((c) => isRepositoryScoped(c) || isSpaceScoped(c));
}

function runCommand(command, args, { allowFailure = false } = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });

  if (result.error) {
    throw new Error(`${command} could not be executed: ${result.error.message}`);
  }

  if (result.status !== 0 && !allowFailure) {
    throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || '').trim()}`);
  }

  return result.stdout;
}

function runGit(args, { cwd = process.cwd() } = {}) {
  const result = spawnSync('git', args, {
    cwd,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`git could not be executed: ${result.error.message}`);
  }

  return result;
}

/**
 * Resolves a user-supplied tag or ref once so an unavailable baseline is a
 * hard input error, not nine apparently missing repository components. Using
 * the resolved commit also keeps every file read pinned to the same snapshot.
 */
function resolveGitCommit(ref, { cwd = process.cwd() } = {}) {
  const result = runGit(
    ['rev-parse', '--verify', '--quiet', '--end-of-options', `${ref}^{commit}`],
    { cwd }
  );

  if (result.status !== 0) {
    throw new Error(
      `Git ref "${ref}" does not resolve to a commit. Check that it is spelled correctly and fetched locally.`
    );
  }

  return result.stdout.trim();
}

/**
 * Reads a file either from the working tree or, when a tag is supplied, from
 * that tag. Reading through git is what makes verification reproducible from a
 * release tag without disturbing the checkout.
 */
function readTrackedFile(relativePath, { cwd = process.cwd(), commit = null } = {}) {
  if (commit) {
    const pathResult = runGit(
      ['ls-tree', '-z', '--full-tree', commit, '--', `:(literal)${relativePath}`],
      { cwd }
    );

    if (pathResult.status !== 0) {
      throw new Error(
        `git ls-tree failed for ${commit}: ${(pathResult.stderr || '').trim() || 'unknown error'}`
      );
    }

    if (!pathResult.stdout) {
      return null;
    }

    const result = runGit(['show', `${commit}:${relativePath}`], { cwd });

    if (result.status !== 0) {
      throw new Error(
        `git show failed for ${commit}:${relativePath}: ${(result.stderr || '').trim() || 'unknown error'}`
      );
    }

    return result.stdout;
  }

  const absolute = path.resolve(cwd, relativePath);

  return fs.existsSync(absolute) ? fs.readFileSync(absolute, 'utf8') : null;
}

/**
 * Observes the repository half of the inventory. No build is required, so an
 * auditor can reproduce this from a tag on any machine with the repository.
 */
function deriveRepositoryComponents(declared, { cwd = process.cwd(), tag = null } = {}) {
  const commit = tag ? resolveGitCommit(tag, { cwd }) : null;

  return declared.filter(isRepositoryScoped).reduce((observed, component) => {
    const filePath = component.locator.value;
    const content = readTrackedFile(filePath, { cwd, commit });

    if (content === null) {
      return observed;
    }

    observed.push({
      class: component.class,
      name: component.name,
      locator: { type: 'repositoryFile', value: filePath },
      sha256: hashContent(content),
    });

    return observed;
  }, []);
}

function cfCurl(apiPath, { allowFailure = false } = {}) {
  const output = runCommand('cf', ['curl', apiPath], { allowFailure });

  if (!output?.trim()) {
    return null;
  }

  try {
    return JSON.parse(output);
  } catch (error) {
    if (allowFailure) {
      return null;
    }

    throw new Error(`cf curl ${apiPath} returned unparseable output: ${error.message}`);
  }
}

function paginationApiPath(href, currentApiPath) {
  try {
    const currentUrl = new URL(currentApiPath, 'https://cloud-controller.invalid');
    const nextUrl = new URL(href, currentUrl);

    return `${nextUrl.pathname}${nextUrl.search}`;
  } catch (error) {
    throw new Error(
      `Cloud Foundry returned an invalid pagination link "${href}": ${error.message}`
    );
  }
}

/**
 * Follows a Cloud Foundry v3 collection through every pagination.next link.
 * Included resources are accumulated as well because service plan metadata is
 * returned alongside each page of service instances.
 */
function fetchPaginatedCfCollection(apiPath, { fetchPage = cfCurl } = {}) {
  const resources = [];
  const included = {};
  const visited = new Set();
  let nextApiPath = apiPath;

  while (nextApiPath) {
    if (visited.has(nextApiPath)) {
      throw new Error(`Cloud Foundry pagination repeated ${nextApiPath}`);
    }

    visited.add(nextApiPath);
    const page = fetchPage(nextApiPath);

    if (
      !page ||
      !Array.isArray(page.resources) ||
      !page.pagination ||
      !Object.hasOwn(page.pagination, 'next')
    ) {
      throw new Error(`Cloud Foundry collection ${nextApiPath} returned an invalid response`);
    }

    resources.push(...page.resources);

    Object.entries(page.included || {}).forEach(([resourceType, values]) => {
      if (!Array.isArray(values)) {
        throw new Error(
          `Cloud Foundry collection ${nextApiPath} returned invalid included.${resourceType}`
        );
      }

      included[resourceType] = [...(included[resourceType] || []), ...values];
    });

    const next = page.pagination.next;

    if (next && !next.href) {
      throw new Error(`Cloud Foundry collection ${nextApiPath} returned an invalid next page`);
    }

    nextApiPath = next?.href ? paginationApiPath(next.href, nextApiPath) : null;
  }

  return { resources, included };
}

function resolveSpaceGuid(spaceName) {
  return runCommand('cf', ['space', spaceName, '--guid']).trim();
}

/**
 * Collects the live space through the platform API rather than by parsing the
 * human readable cf tables, which change format between CLI versions.
 *
 * Records names, types, GUIDs, and plans only. Never reads application
 * environment or service keys, per ADR 0029.
 */
function collectSpaceState(spaceName) {
  const spaceGuid = resolveSpaceGuid(spaceName);
  const apps = fetchPaginatedCfCollection(
    `/v3/apps?space_guids=${spaceGuid}&per_page=200`
  ).resources;
  const routes = fetchPaginatedCfCollection(
    `/v3/routes?space_guids=${spaceGuid}&per_page=200`
  ).resources;

  // include=service_plan resolves plan names in one call. A plan change alters
  // the authorized shape of a service, so the plan is part of the record.
  const serviceResponse = fetchPaginatedCfCollection(
    `/v3/service_instances?space_guids=${spaceGuid}&per_page=200&include=service_plan`
  );
  const plansByGuid = new Map(
    (serviceResponse.included?.service_plans || []).map((plan) => [plan.guid, plan.name])
  );
  const services = serviceResponse.resources.map((service) => ({
    ...service,
    planName: plansByGuid.get(service.relationships?.service_plan?.data?.guid) || null,
  }));

  const processes = apps.flatMap((app) =>
    fetchPaginatedCfCollection(`/v3/apps/${app.guid}/processes?per_page=200`).resources.map(
      (process) => ({
        ...process,
        appName: app.name,
      })
    )
  );

  const droplets = apps.reduce((collected, app) => {
    const droplet = cfCurl(`/v3/apps/${app.guid}/droplets/current`, { allowFailure: true });

    if (droplet?.buildpacks) {
      collected.push({ appName: app.name, buildpacks: droplet.buildpacks, stack: droplet.stack });
    }

    return collected;
  }, []);

  return {
    spaceGuid,
    apps,
    services,
    routes,
    processes,
    droplets,
  };
}

/**
 * Shapes raw platform state into comparable components. Kept separate from
 * collection so it can be tested against recorded fixtures without a live
 * cloud.gov session.
 */
function deriveSpaceComponents(spaceState, { primaryAppName = null } = {}) {
  const observed = [];
  const appNamesByGuid = new Map(spaceState.apps.map((app) => [app.guid, app.name]));

  spaceState.apps.forEach((app) => {
    observed.push({
      class: 'application',
      name: app.name,
      locator: { type: 'cloudFoundryApp', value: app.name },
      guid: app.guid,
      state: app.state,
    });
  });

  spaceState.processes.forEach((process) => {
    if (primaryAppName && process.appName !== primaryAppName) {
      return;
    }

    observed.push({
      class: 'process',
      name: `${process.appName}:${process.type}`,
      locator: {
        type: 'cloudFoundryProcess',
        value: process.type,
        processInstances: process.instances,
      },
      guid: process.guid,
      boundAppName: process.appName,
    });
  });

  spaceState.services.forEach((service) => {
    observed.push({
      class: 'service',
      name: service.name,
      locator: {
        type: 'cloudFoundryService',
        value: service.name,
        servicePlan: service.planName || null,
      },
      guid: service.guid,
    });
  });

  spaceState.routes.forEach((route) => {
    const boundAppGuid = route.destinations?.[0]?.app?.guid || null;

    observed.push({
      class: 'route',
      name: route.url,
      locator: { type: 'cloudFoundryRoute', value: route.url },
      guid: route.guid,
      boundAppGuid,
      boundAppName: boundAppGuid ? appNamesByGuid.get(boundAppGuid) || null : null,
    });
  });

  spaceState.droplets
    .filter((droplet) => !primaryAppName || droplet.appName === primaryAppName)
    .forEach((droplet) => {
      if (droplet.stack) {
        observed.push({
          class: 'platformRuntime',
          name: droplet.stack,
          locator: { type: 'cloudFoundryStack', value: droplet.stack },
        });
      }

      droplet.buildpacks.forEach((buildpack) => {
        observed.push({
          class: 'platformRuntime',
          name: buildpack.name,
          locator: { type: 'cloudFoundryBuildpack', value: buildpack.version || null },
        });
      });
    });

  return observed;
}

function activeDispositionsByComponent(dispositions) {
  return (dispositions.dispositions || [])
    .filter((d) => ACTIVE_DISPOSITION_STATUSES.has(d.status))
    .reduce((byName, d) => byName.set(`${d.componentClass}:${d.componentName}`, d), new Map());
}

/**
 * Active dispositions past their closureTarget. Reported, not treated as a
 * validation error, so a lapsed closure date surfaces on every run without
 * making it a build failure on its own.
 */
function overdueDispositions(dispositions, { now = new Date() } = {}) {
  return (dispositions.dispositions || [])
    .filter((d) => ACTIVE_DISPOSITION_STATUSES.has(d.status) && d.closureTarget)
    .filter((d) => new Date(d.closureTarget) < now)
    .map((d) => ({ id: d.id, componentName: d.componentName, closureTarget: d.closureTarget }));
}

/**
 * Fields reconciliation compares once identity matches, so a component isn't
 * reported clean just because it exists under the right name. Deliberately
 * excludes route boundAppName, since the maintenance page remap is a
 * legitimate operational state and must not read as drift.
 */
function driftFields(component) {
  if (isRepositoryScoped(component)) {
    return ['sha256'];
  }

  if (component.class === 'process') {
    return ['processInstances'];
  }

  if (component.class === 'service') {
    return ['servicePlan'];
  }

  if (component.class === 'platformRuntime' && component.locator.type === 'cloudFoundryBuildpack') {
    return ['value'];
  }

  return [];
}

function fieldDrift(component, observation) {
  const declaredLocator = component.locator || {};
  const observedLocator = observation.locator || {};

  return driftFields(component)
    .map((field) => ({
      field,
      declared: field === 'sha256' ? component.sha256 : declaredLocator[field],
      observed: field === 'sha256' ? observation.sha256 : observedLocator[field],
    }))
    .filter(({ declared, observed }) => declared !== observed);
}

/**
 * Produces the four result sets ADR 0029 defines. A component covered by an
 * active disposition is reported separately rather than silently dropped, so
 * the record still shows it was seen.
 */
function reconcile({ declared, observed, dispositions = { dispositions: [] }, environment }) {
  const dispositioned = activeDispositionsByComponent(dispositions);
  const declaredByIdentity = new Map(declared.map((c) => [declaredIdentity(c, environment), c]));
  const observedByIdentity = new Map(
    observed.map((c) => [componentIdentity(c.class, c.name, environment), c])
  );

  const matched = [];
  const mismatch = [];
  const missing = [];
  const undocumented = [];
  const suppressed = [];

  declaredByIdentity.forEach((component, identity) => {
    const observation = observedByIdentity.get(identity);
    const entry = {
      identity,
      id: component.id,
      name: substituteEnv(component.name, environment),
      ...(observation?.sha256 ? { observedSha256: observation.sha256 } : {}),
    };

    if (observation) {
      const drift = fieldDrift(component, observation);

      if (drift.length === 0) {
        matched.push(entry);

        return;
      }

      const mismatchEntry = { ...entry, drift };
      const disposition = dispositioned.get(identity);

      if (disposition) {
        suppressed.push({ ...mismatchEntry, result: 'mismatch', dispositionId: disposition.id });

        return;
      }

      mismatch.push(mismatchEntry);

      return;
    }

    const disposition = dispositioned.get(identity);

    if (disposition) {
      suppressed.push({ ...entry, result: 'missing', dispositionId: disposition.id });

      return;
    }

    missing.push(entry);
  });

  observedByIdentity.forEach((observation, identity) => {
    if (declaredByIdentity.has(identity)) {
      return;
    }

    const entry = { identity, name: observation.name, class: observation.class };
    const disposition = dispositioned.get(identity);

    if (disposition) {
      suppressed.push({ ...entry, result: 'undocumented', dispositionId: disposition.id });

      return;
    }

    undocumented.push(entry);
  });

  return {
    matched,
    mismatch,
    missing,
    undocumented,
    suppressed,
  };
}

/**
 * Declared components may only carry a none authorization reference while an
 * active disposition explains why. Without this check the inventory could be
 * made to pass by declaring every unknown component with no reference at all,
 * which is the failure mode the audit finding describes.
 */
function validateInventory(inventory, dispositions) {
  const dispositioned = activeDispositionsByComponent(dispositions);
  const errors = [];
  const seenIds = new Set();

  inventory.components.forEach((component) => {
    if (seenIds.has(component.id)) {
      errors.push(`duplicate component id ${component.id}`);
    }

    seenIds.add(component.id);

    if (component.authorization.type === 'none') {
      const identity = `${component.class}:${substituteEnv(component.name, inventory.space.environment)}`;

      if (!dispositioned.has(identity)) {
        errors.push(
          `${component.id} declares no authorization reference and has no active disposition`
        );
      }
    }
  });

  return errors;
}

function summarize(result) {
  return {
    matched: result.matched.length,
    mismatch: result.mismatch.length,
    undocumented: result.undocumented.length,
    missing: result.missing.length,
    suppressed: result.suppressed.length,
  };
}

function locatorVersion(component, environment) {
  const locator = component.locator || {};
  const value = locator.value ? substituteEnv(locator.value, environment) : null;

  if (locator.type === 'cmsDocument') {
    return component.approvedVersion || value;
  }

  if (locator.type === 'repositoryFile') {
    return component.sha256 || null;
  }

  if (locator.type === 'cloudFoundryService' && locator.servicePlan) {
    return `${value} (${locator.servicePlan})`;
  }

  if (locator.type === 'cloudFoundryProcess') {
    return `${value} (${locator.processInstances ?? 0} instances)`;
  }

  if (locator.type === 'cloudFoundryBuildpack') {
    return locator.value;
  }

  return value;
}

function buildCmsApprovedCiVersions(inventory, options = {}) {
  const environment = inventory.space.environment;
  const generatedAtUtc = options.generatedAtUtc || new Date().toISOString();
  const releaseTag = options.releaseTag || null;
  const releaseCommit = options.releaseCommit || null;
  const pipelineUrl = options.pipelineUrl || null;

  return {
    schemaVersion: 1,
    exportType: 'cmsApprovedCiVersions',
    generatedAtUtc,
    source: {
      system: 'TTA Hub release inventory',
      path: options.inventoryPath || DEFAULT_INVENTORY_PATH,
      sha256: options.inventorySha256 || null,
      authorizationModel: 'ADR 0029',
    },
    baseline: {
      environment,
      releaseTag,
      releaseCommit,
      pipelineUrl,
    },
    configurationItems: inventory.components.map((component) => {
      const approval = component.authorization.approval || null;

      return {
        id: component.id,
        name: substituteEnv(component.name, environment),
        class: component.class,
        tier: component.tier,
        approvedVersion: locatorVersion(component, environment),
        owner: component.owner,
        approvalReference: {
          type: component.authorization.type,
          reference: component.authorization.reference,
          note: component.authorization.note || null,
        },
        approvalDate: approval?.approvalDate || null,
        releaseTag,
        releaseCommit,
        environment,
        locator: {
          ...component.locator,
          value: substituteEnv(component.locator.value, environment),
        },
        sha256: component.sha256 || null,
        notes: component.notes || null,
      };
    }),
  };
}

function csvCell(value) {
  if (value === null || value === undefined) {
    return '';
  }

  const stringValue = String(value);

  if (/[",\n\r]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

function cmsApprovedCiVersionsCsv(exportData) {
  const headers = [
    'id',
    'name',
    'class',
    'tier',
    'approvedVersion',
    'owner',
    'approvalReferenceType',
    'approvalReference',
    'approvalDate',
    'releaseTag',
    'releaseCommit',
    'environment',
  ];
  const rows = exportData.configurationItems.map((item) => [
    item.id,
    item.name,
    item.class,
    item.tier,
    item.approvedVersion,
    item.owner,
    item.approvalReference.type,
    item.approvalReference.reference,
    item.approvalDate,
    item.releaseTag,
    item.releaseCommit,
    item.environment,
  ]);

  return `${[headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')}\n`;
}

function commandCmsExport(options) {
  const inventory = readJson(options.inventory);
  const dispositions = readJson(options.dispositions);
  const validationErrors = [
    ...schemaErrors(readJson(DEFAULT_INVENTORY_SCHEMA_PATH), inventory, 'inventory.json'),
    ...schemaErrors(
      readJson(DEFAULT_DISPOSITIONS_SCHEMA_PATH),
      dispositions,
      'inventoryDispositions.json'
    ),
  ];

  if (validationErrors.length === 0) {
    validationErrors.push(...validateInventory(inventory, dispositions));
  }

  if (validationErrors.length > 0) {
    validationErrors.forEach((error) => {
      console.log(`  inventory error: ${error}`);
    });
    console.log('Approved CI version export was not generated from invalid inventory input.');

    return 1;
  }

  const inventoryContent = fs.readFileSync(options.inventory);
  const exportData = buildCmsApprovedCiVersions(inventory, {
    inventoryPath: options.inventory,
    inventorySha256: hashContent(inventoryContent),
    releaseTag: options.releaseTag,
    releaseCommit: options.releaseCommit,
    pipelineUrl: options.pipelineUrl,
  });

  writeJson(options.out, exportData);
  console.log(
    `Wrote ${exportData.configurationItems.length} approved CI version records to ${options.out}`
  );

  if (options.csvOut) {
    fs.mkdirSync(path.dirname(options.csvOut), { recursive: true });
    fs.writeFileSync(options.csvOut, cmsApprovedCiVersionsCsv(exportData), 'utf8');
    console.log(`Wrote approved CI version CSV export to ${options.csvOut}`);
  }

  return 0;
}

function commandGenerate(options) {
  const inventory = readJson(options.inventory);
  const environment = inventory.space.environment;
  const declared = selectDeclared(inventory, options.scope);

  const observed =
    options.scope === 'space'
      ? deriveSpaceComponents(collectSpaceState(inventory.space.name), {
          primaryAppName: substituteEnv('tta-smarthub-((env))', environment),
        })
      : deriveRepositoryComponents(declared, { tag: options.tag });

  const output = {
    schemaVersion: 1,
    scope: options.scope,
    environment,
    tag: options.tag || null,
    generatedAtUtc: new Date().toISOString(),
    components: observed,
  };

  writeJson(options.out, output);
  console.log(`Wrote ${observed.length} observed components to ${options.out}`);

  return 0;
}

function commandVerify(options) {
  const inventory = readJson(options.inventory);
  const dispositions = readJson(options.dispositions);

  const schemaValidationErrors = [
    ...schemaErrors(readJson(DEFAULT_INVENTORY_SCHEMA_PATH), inventory, 'inventory.json'),
    ...schemaErrors(
      readJson(DEFAULT_DISPOSITIONS_SCHEMA_PATH),
      dispositions,
      'inventoryDispositions.json'
    ),
  ];

  if (schemaValidationErrors.length > 0) {
    const report = {
      schemaVersion: 1,
      generatedAtUtc: new Date().toISOString(),
      enforcement: options.enforce ? 'blocking' : 'reporting',
      validationErrors: schemaValidationErrors,
      overdueDispositions: [],
      scopes: {},
    };

    writeJson(options.out, report);
    schemaValidationErrors.forEach((error) => {
      console.log(`  inventory error: ${error}`);
    });
    console.log('Schema validation failed. Reconciliation did not run against invalid input.');

    return options.enforce ? 1 : 0;
  }

  const environment = inventory.space.environment;

  const validationErrors = validateInventory(inventory, dispositions);
  const overdue = overdueDispositions(dispositions);
  const scopes = options.scope === 'all' ? ['repository', 'space'] : [options.scope];

  const results = scopes.reduce((collected, scope) => {
    const declared = selectDeclared(inventory, scope);
    const observed =
      scope === 'space'
        ? deriveSpaceComponents(collectSpaceState(inventory.space.name), {
            primaryAppName: substituteEnv('tta-smarthub-((env))', environment),
          })
        : deriveRepositoryComponents(declared, { tag: options.tag });

    collected[scope] = reconcile({
      declared,
      observed,
      dispositions,
      environment,
    });

    return collected;
  }, {});

  const report = {
    schemaVersion: 1,
    environment,
    tag: options.tag || null,
    generatedAtUtc: new Date().toISOString(),
    inventorySha256: hashContent(fs.readFileSync(options.inventory)),
    enforcement: options.enforce ? 'blocking' : 'reporting',
    validationErrors,
    overdueDispositions: overdue,
    scopes: Object.fromEntries(
      Object.entries(results).map(([scope, result]) => [
        scope,
        { summary: summarize(result), ...result },
      ])
    ),
  };

  writeJson(options.out, report);

  Object.entries(results).forEach(([scope, result]) => {
    const s = summarize(result);
    console.log(
      `${scope}: ${s.matched} matched, ${s.mismatch} mismatch, ${s.undocumented} undocumented, ${s.missing} missing, ${s.suppressed} dispositioned`
    );
    result.mismatch.forEach((c) => {
      console.log(`  mismatch: ${c.identity} (${c.drift.map((d) => d.field).join(', ')})`);
    });
    result.undocumented.forEach((c) => {
      console.log(`  undocumented: ${c.identity}`);
    });
    result.missing.forEach((c) => {
      console.log(`  missing: ${c.identity}`);
    });
  });

  validationErrors.forEach((error) => {
    console.log(`  inventory error: ${error}`);
  });

  overdue.forEach((d) => {
    console.log(
      `  overdue disposition: ${d.id} (${d.componentName}) passed its closure target of ${d.closureTarget}`
    );
  });

  const hasFindings =
    validationErrors.length > 0 ||
    Object.values(results).some(
      (r) => r.mismatch.length > 0 || r.undocumented.length > 0 || r.missing.length > 0
    );

  if (!options.enforce) {
    console.log(
      hasFindings
        ? 'Reporting mode: findings recorded, not failing the build. See ADR 0029.'
        : 'Reporting mode: reconciliation clean.'
    );

    return 0;
  }

  return hasFindings ? 1 : 0;
}

function main(argv) {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      scope: { type: 'string', default: 'repository' },
      tag: { type: 'string' },
      'release-tag': { type: 'string' },
      'release-commit': { type: 'string' },
      'pipeline-url': { type: 'string' },
      inventory: { type: 'string', default: DEFAULT_INVENTORY_PATH },
      dispositions: { type: 'string', default: DEFAULT_DISPOSITIONS_PATH },
      out: { type: 'string' },
      'csv-out': { type: 'string' },
      enforce: { type: 'boolean', default: false },
    },
  });

  const command = positionals[0];
  const options = {
    ...values,
    releaseTag: values['release-tag'],
    releaseCommit: values['release-commit'],
    pipelineUrl: values['pipeline-url'],
    csvOut: values['csv-out'] || (command === 'cms-export' ? DEFAULT_CMS_CSV_EXPORT_PATH : null),
    out:
      values.out ||
      (command === 'cms-export'
        ? DEFAULT_CMS_EXPORT_PATH
        : command === 'generate'
          ? `${DEFAULT_ARTIFACTS_DIR}/observedInventory.json`
          : DEFAULT_RECONCILIATION_PATH),
  };

  if (command === 'generate') {
    return commandGenerate(options);
  }

  if (command === 'verify') {
    return commandVerify(options);
  }

  if (command === 'cms-export') {
    return commandCmsExport(options);
  }

  console.error(
    'Usage: releaseInventory.js <generate|verify|cms-export> [--scope repository|space|all] [--tag <releaseTag>] [--enforce]'
  );

  return 2;
}

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
  }
}

module.exports = {
  buildCmsApprovedCiVersions,
  cmsApprovedCiVersionsCsv,
  componentIdentity,
  deriveRepositoryComponents,
  deriveSpaceComponents,
  fetchPaginatedCfCollection,
  hashContent,
  main,
  overdueDispositions,
  reconcile,
  schemaErrors,
  selectDeclared,
  substituteEnv,
  validateInventory,
};
