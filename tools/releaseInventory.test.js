const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const {
  componentIdentity,
  deriveRepositoryComponents,
  deriveSpaceComponents,
  fetchPaginatedCfCollection,
  hashContent,
  overdueDispositions,
  reconcile,
  schemaErrors,
  selectDeclared,
  substituteEnv,
  validateInventory,
} = require('./releaseInventory');

const inventory = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../release/inventory.json'), 'utf8')
);
const dispositions = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../release/inventoryDispositions.json'), 'utf8')
);
const inventorySchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../release/inventorySchema.json'), 'utf8')
);
const dispositionsSchema = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../release/inventoryDispositionsSchema.json'), 'utf8')
);

/**
 * Shaped like the /v3 payloads cloud.gov returns for the ttahub-prod space,
 * recorded during the first reconciliation. Used so the space half can be
 * tested without a live session.
 */
const productionSpaceState = {
  spaceGuid: 'space-guid',
  apps: [
    { guid: 'app-1', name: 'tta-smarthub-prod', state: 'STARTED' },
    { guid: 'app-2', name: 'clamav-api-ttahub-prod', state: 'STARTED' },
    { guid: 'app-3', name: 'tta-similarity-api-prod', state: 'STOPPED' },
    { guid: 'app-4', name: 'tta-automation', state: 'STOPPED' },
    { guid: 'app-5', name: 'tta-smarthub-maintenance-page-prod', state: 'STARTED' },
  ],
  processes: [
    {
      guid: 'proc-1',
      type: 'web',
      instances: 3,
      appName: 'tta-smarthub-prod',
    },
    {
      guid: 'proc-2',
      type: 'worker',
      instances: 2,
      appName: 'tta-smarthub-prod',
    },
    {
      guid: 'proc-3',
      type: 'web',
      instances: 1,
      appName: 'clamav-api-ttahub-prod',
    },
  ],
  services: [
    { guid: 'svc-1', name: 'ttahub-prod', planName: 'small-psql-replica' },
    { guid: 'svc-2', name: 'ttahub-redis-prod', planName: 'redis-3node' },
    { guid: 'svc-3', name: 'ttahub-document-upload-prod', planName: 'basic' },
    { guid: 'svc-4', name: 'ttahub-process', planName: 'micro-psql' },
    { guid: 'svc-5', name: 'ttahub-db-backups', planName: 'basic' },
    { guid: 'svc-6', name: 'ttahub-log-transfer', planName: 'basic' },
    { guid: 'svc-7', name: 'ttahub-staging', planName: 'micro-psql' },
    { guid: 'svc-8', name: 'ttahub-dev-blue', planName: 'micro-psql' },
    { guid: 'svc-9', name: 'ttahub-dev-gold', planName: 'micro-psql' },
    { guid: 'svc-10', name: 'ttahub-dev-green', planName: 'micro-psql' },
    { guid: 'svc-11', name: 'ttahub-dev-pink', planName: 'micro-psql' },
    { guid: 'svc-12', name: 'ttahub-dev-red', planName: 'micro-psql' },
    { guid: 'svc-13', name: 'domain-prod', planName: 'domain' },
    { guid: 'svc-14', name: 'prod-app-deployer', planName: 'space-deployer' },
    { guid: 'svc-15', name: 'adam.levin', planName: 'space-deployer' },
  ],
  routes: [
    { guid: 'route-1', url: 'ttahub.ohs.acf.hhs.gov', destinations: [{ app: { guid: 'app-1' } }] },
    {
      guid: 'route-2',
      url: 'tta-smarthub-prod1.app.cloud.gov',
      destinations: [{ app: { guid: 'app-1' } }],
    },
    {
      guid: 'route-3',
      url: 'clamapi-ttahub-prod.apps.internal',
      destinations: [{ app: { guid: 'app-2' } }],
    },
    {
      guid: 'route-4',
      url: 'tta-smarthub-maintenance-page-prod.app.cloud.gov',
      destinations: [{ app: { guid: 'app-5' } }],
    },
    {
      guid: 'route-5',
      url: 'tta-similarity-api-prod.app.cloud.gov',
      destinations: [{ app: { guid: 'app-3' } }],
    },
    { guid: 'route-6', url: 'tta-smarthub-prod.app.cloud.gov', destinations: [] },
    { guid: 'route-7', url: 'tta-automation.app.cloud.gov', destinations: [] },
  ],
  droplets: [
    {
      appName: 'tta-smarthub-prod',
      stack: 'cflinuxfs4',
      buildpacks: [{ name: 'nodejs-buildpack', version: '1.9.4' }],
    },
  ],
};

describe('substituteEnv', () => {
  it('replaces every occurrence of the env token', () => {
    expect(substituteEnv('ttahub-((env))-((env))', 'prod')).toBe('ttahub-prod-prod');
  });

  it('leaves names without the token untouched', () => {
    expect(substituteEnv('tta-automation', 'prod')).toBe('tta-automation');
  });
});

describe('componentIdentity', () => {
  it('is stable across values that change between deploys', () => {
    const first = componentIdentity('application', 'tta-smarthub-((env))', 'prod');
    const second = componentIdentity('application', 'tta-smarthub-prod', 'prod');

    expect(first).toBe(second);
  });

  it('distinguishes components of different classes with the same name', () => {
    expect(componentIdentity('route', 'x', 'prod')).not.toBe(
      componentIdentity('service', 'x', 'prod')
    );
  });
});

describe('selectDeclared', () => {
  it('excludes attested components from every scope', () => {
    const all = selectDeclared(inventory, 'all');

    expect(all.some((c) => c.tier === 'attested')).toBe(false);
    expect(inventory.components.some((c) => c.tier === 'attested')).toBe(true);
  });

  it('splits repository and space scopes without overlap', () => {
    const repository = selectDeclared(inventory, 'repository').map((c) => c.id);
    const space = selectDeclared(inventory, 'space').map((c) => c.id);

    expect(repository.length).toBeGreaterThan(0);
    expect(space.length).toBeGreaterThan(0);
    expect(repository.filter((id) => space.includes(id))).toEqual([]);
  });
});

describe('deriveRepositoryComponents', () => {
  let workingDirectory;
  const taggedManifest = 'applications: []\n';

  beforeAll(() => {
    workingDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'release-inventory-'));
    fs.writeFileSync(path.join(workingDirectory, 'manifest.yml'), taggedManifest);
    execFileSync('git', ['init', '--quiet', '--initial-branch=main'], { cwd: workingDirectory });
    execFileSync('git', ['add', 'manifest.yml'], { cwd: workingDirectory });
    execFileSync(
      'git',
      [
        '-c',
        'user.name=Release Inventory Test',
        '-c',
        'user.email=release-inventory@example.com',
        'commit',
        '-m',
        'Add manifest fixture',
      ],
      { cwd: workingDirectory }
    );
    execFileSync('git', ['tag', 'inventory-baseline'], { cwd: workingDirectory });
  });

  afterAll(() => {
    fs.rmSync(workingDirectory, { recursive: true, force: true });
  });

  it('hashes declared files that exist', () => {
    const declared = [
      {
        id: 'configuration.manifest',
        class: 'configurationArtifact',
        name: 'manifest.yml',
        tier: 'reconciled',
        locator: { type: 'repositoryFile', value: 'manifest.yml' },
      },
    ];

    const observed = deriveRepositoryComponents(declared, { cwd: workingDirectory });

    expect(observed).toHaveLength(1);
    expect(observed[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('omits declared files that are absent so they reconcile as missing', () => {
    const declared = [
      {
        id: 'configuration.gone',
        class: 'configurationArtifact',
        name: 'nope.yml',
        tier: 'reconciled',
        locator: { type: 'repositoryFile', value: 'nope.yml' },
      },
    ];

    expect(deriveRepositoryComponents(declared, { cwd: workingDirectory })).toEqual([]);
  });

  it('throws when a requested tag does not resolve to a commit', () => {
    expect(() =>
      deriveRepositoryComponents([], {
        cwd: workingDirectory,
        tag: 'definitely-not-a-real-tag',
      })
    ).toThrow(/does not resolve to a commit.*fetched locally/);
  });

  it('omits a file absent from a valid tag so it reconciles as missing', () => {
    const declared = [
      {
        id: 'configuration.gone',
        class: 'configurationArtifact',
        name: 'nope.yml',
        tier: 'reconciled',
        locator: { type: 'repositoryFile', value: 'nope.yml' },
      },
    ];

    expect(
      deriveRepositoryComponents(declared, {
        cwd: workingDirectory,
        tag: 'inventory-baseline',
      })
    ).toEqual([]);
  });

  it('reads an existing file from the resolved tag commit', () => {
    const declared = [
      {
        id: 'configuration.manifest',
        class: 'configurationArtifact',
        name: 'manifest.yml',
        tier: 'reconciled',
        locator: { type: 'repositoryFile', value: 'manifest.yml' },
      },
    ];

    fs.writeFileSync(path.join(workingDirectory, 'manifest.yml'), 'working tree changed\n');

    const observed = deriveRepositoryComponents(declared, {
      cwd: workingDirectory,
      tag: 'inventory-baseline',
    });

    expect(observed[0].sha256).toBe(hashContent(taggedManifest));
  });
});

describe('fetchPaginatedCfCollection', () => {
  it('follows next links and accumulates resources and included records', () => {
    const fetchPage = jest
      .fn()
      .mockReturnValueOnce({
        resources: [{ guid: 'service-1' }],
        included: { service_plans: [{ guid: 'plan-1', name: 'small' }] },
        pagination: {
          next: {
            href: 'https://api.example.gov/v3/service_instances?page=2&per_page=200',
          },
        },
      })
      .mockReturnValueOnce({
        resources: [{ guid: 'service-2' }],
        included: { service_plans: [{ guid: 'plan-2', name: 'medium' }] },
        pagination: { next: null },
      });

    const result = fetchPaginatedCfCollection(
      '/v3/service_instances?space_guids=space-1&per_page=200&include=service_plan',
      { fetchPage }
    );

    expect(fetchPage.mock.calls.map(([apiPath]) => apiPath)).toEqual([
      '/v3/service_instances?space_guids=space-1&per_page=200&include=service_plan',
      '/v3/service_instances?page=2&per_page=200',
    ]);
    expect(result.resources).toEqual([{ guid: 'service-1' }, { guid: 'service-2' }]);
    expect(result.included.service_plans).toEqual([
      { guid: 'plan-1', name: 'small' },
      { guid: 'plan-2', name: 'medium' },
    ]);
  });

  it('fails instead of looping when the API repeats a pagination link', () => {
    const fetchPage = jest.fn().mockReturnValue({
      resources: [],
      pagination: { next: { href: '/v3/apps?per_page=200' } },
    });

    expect(() => fetchPaginatedCfCollection('/v3/apps?per_page=200', { fetchPage })).toThrow(
      /pagination repeated/
    );
  });

  it('fails on a collection response without pagination state', () => {
    expect(() =>
      fetchPaginatedCfCollection('/v3/apps?per_page=200', {
        fetchPage: () => ({ resources: [], pagination: {} }),
      })
    ).toThrow(/invalid response/);
  });
});

describe('deriveSpaceComponents', () => {
  const observed = deriveSpaceComponents(productionSpaceState, {
    primaryAppName: 'tta-smarthub-prod',
  });

  it('captures every application in the space, not only the deployed one', () => {
    const applications = observed.filter((c) => c.class === 'application').map((c) => c.name);

    expect(applications).toHaveLength(5);
    expect(applications).toContain('clamav-api-ttahub-prod');
  });

  it('limits process observation to the primary application', () => {
    const processes = observed.filter((c) => c.class === 'process').map((c) => c.name);

    expect(processes).toEqual(['tta-smarthub-prod:web', 'tta-smarthub-prod:worker']);
  });

  it('records service plans, because a plan change alters the authorized shape', () => {
    const database = observed.find((c) => c.class === 'service' && c.name === 'ttahub-prod');

    expect(database.locator.servicePlan).toBe('small-psql-replica');
  });

  it('records the staged buildpack version', () => {
    const buildpack = observed.find((c) => c.locator.type === 'cloudFoundryBuildpack');

    expect(buildpack.locator.value).toBe('1.9.4');
  });

  it('records a route destination app name and GUID in their corresponding fields', () => {
    const route = observed.find(
      (component) => component.class === 'route' && component.name === 'ttahub.ohs.acf.hhs.gov'
    );

    expect(route.boundAppName).toBe('tta-smarthub-prod');
    expect(route.boundAppGuid).toBe('app-1');
  });

  it('retains an unresolved route destination GUID without calling it an app name', () => {
    const [route] = deriveSpaceComponents({
      apps: [],
      processes: [],
      services: [],
      droplets: [],
      routes: [
        {
          guid: 'route-unknown',
          url: 'unknown.app.cloud.gov',
          destinations: [{ app: { guid: 'unknown-app-guid' } }],
        },
      ],
    });

    expect(route.boundAppName).toBeNull();
    expect(route.boundAppGuid).toBe('unknown-app-guid');
  });

  it('does not capture credentials or environment values', () => {
    const serialized = JSON.stringify(observed);

    expect(serialized).not.toMatch(/password|secret|credential|token/i);
  });
});

describe('reconcile', () => {
  const environment = 'prod';

  it('matches a declared component against its observation', () => {
    const declared = [
      {
        id: 'app.x',
        class: 'application',
        name: 'x-((env))',
        tier: 'reconciled',
        locator: { type: 'cloudFoundryApp', value: 'x-((env))' },
      },
    ];
    const observed = [
      {
        class: 'application',
        name: 'x-prod',
        locator: { type: 'cloudFoundryApp', value: 'x-prod' },
      },
    ];

    const result = reconcile({ declared, observed, environment });

    expect(result.matched).toHaveLength(1);
    expect(result.undocumented).toEqual([]);
    expect(result.missing).toEqual([]);
  });

  it('reports an observed component that is not declared as undocumented', () => {
    const observed = [
      {
        class: 'service',
        name: 'surprise',
        locator: { type: 'cloudFoundryService', value: 'surprise' },
      },
    ];

    const result = reconcile({ declared: [], observed, environment });

    expect(result.undocumented).toHaveLength(1);
    expect(result.undocumented[0].name).toBe('surprise');
  });

  it('reports a declared component that is absent as missing', () => {
    const declared = [
      {
        id: 'app.gone',
        class: 'application',
        name: 'gone',
        tier: 'reconciled',
        locator: { type: 'cloudFoundryApp', value: 'gone' },
      },
    ];

    const result = reconcile({ declared, observed: [], environment });

    expect(result.missing).toHaveLength(1);
  });

  it('reports a process whose instance count drifted as a mismatch, not matched', () => {
    const declared = [
      {
        id: 'process.web',
        class: 'process',
        name: 'x-((env)):web',
        tier: 'reconciled',
        locator: { type: 'cloudFoundryProcess', value: 'web', processInstances: 3 },
      },
    ];
    const observed = [
      {
        class: 'process',
        name: 'x-prod:web',
        locator: { type: 'cloudFoundryProcess', value: 'web', processInstances: 1 },
      },
    ];

    const result = reconcile({ declared, observed, environment });

    expect(result.matched).toEqual([]);
    expect(result.mismatch).toHaveLength(1);
    expect(result.mismatch[0].drift).toEqual([
      { field: 'processInstances', declared: 3, observed: 1 },
    ]);
  });

  it('reports a repository file whose content hash drifted as a mismatch', () => {
    const declared = [
      {
        id: 'configuration.manifest',
        class: 'configurationArtifact',
        name: 'manifest.yml',
        tier: 'reconciled',
        locator: { type: 'repositoryFile', value: 'manifest.yml' },
        sha256: 'a'.repeat(64),
      },
    ];
    const observed = [
      {
        class: 'configurationArtifact',
        name: 'manifest.yml',
        locator: { type: 'repositoryFile', value: 'manifest.yml' },
        sha256: 'b'.repeat(64),
      },
    ];

    const result = reconcile({ declared, observed, environment });

    expect(result.matched).toEqual([]);
    expect(result.mismatch).toEqual([
      {
        identity: 'configurationArtifact:manifest.yml',
        id: 'configuration.manifest',
        name: 'manifest.yml',
        observedSha256: 'b'.repeat(64),
        drift: [{ field: 'sha256', declared: 'a'.repeat(64), observed: 'b'.repeat(64) }],
      },
    ]);
  });

  it('retains the observed repository hash when content matches', () => {
    const sha256 = 'a'.repeat(64);
    const declared = [
      {
        id: 'configuration.manifest',
        class: 'configurationArtifact',
        name: 'manifest.yml',
        tier: 'reconciled',
        locator: { type: 'repositoryFile', value: 'manifest.yml' },
        sha256,
      },
    ];
    const observed = [
      {
        class: 'configurationArtifact',
        name: 'manifest.yml',
        locator: { type: 'repositoryFile', value: 'manifest.yml' },
        sha256,
      },
    ];

    const result = reconcile({ declared, observed, environment });

    expect(result.matched).toEqual([
      {
        identity: 'configurationArtifact:manifest.yml',
        id: 'configuration.manifest',
        name: 'manifest.yml',
        observedSha256: sha256,
      },
    ]);
  });

  it('reports a service whose plan drifted as a mismatch', () => {
    const declared = [
      {
        id: 'service.database',
        class: 'service',
        name: 'db-((env))',
        tier: 'reconciled',
        locator: { type: 'cloudFoundryService', value: 'db-((env))', servicePlan: 'small-psql' },
      },
    ];
    const observed = [
      {
        class: 'service',
        name: 'db-prod',
        locator: { type: 'cloudFoundryService', value: 'db-prod', servicePlan: 'micro-psql' },
      },
    ];

    const result = reconcile({ declared, observed, environment });

    expect(result.mismatch).toHaveLength(1);
    expect(result.mismatch[0].drift[0].field).toBe('servicePlan');
  });

  it('does not compare route boundAppName, because a maintenance remap is not drift', () => {
    const declared = [
      {
        id: 'route.custom',
        class: 'route',
        name: 'x.app.cloud.gov',
        tier: 'reconciled',
        locator: { type: 'cloudFoundryRoute', value: 'x.app.cloud.gov' },
        boundAppName: 'x-((env))',
      },
    ];
    const observed = [
      {
        class: 'route',
        name: 'x.app.cloud.gov',
        locator: { type: 'cloudFoundryRoute', value: 'x.app.cloud.gov' },
        boundAppName: 'maintenance-page-prod',
      },
    ];

    const result = reconcile({ declared, observed, environment });

    expect(result.matched).toHaveLength(1);
    expect(result.mismatch).toEqual([]);
  });

  it('suppresses a mismatch covered by an active disposition but still records it', () => {
    const declared = [
      {
        id: 'platform.buildpack',
        class: 'platformRuntime',
        name: 'nodejs-buildpack',
        tier: 'reconciled',
        locator: { type: 'cloudFoundryBuildpack', value: '1.9.4' },
      },
    ];
    const observed = [
      {
        class: 'platformRuntime',
        name: 'nodejs-buildpack',
        locator: { type: 'cloudFoundryBuildpack', value: '1.9.9' },
      },
    ];
    const buildpackDisposition = {
      dispositions: [
        {
          id: 'INV-2026-0005',
          componentClass: 'platformRuntime',
          componentName: 'nodejs-buildpack',
          status: 'deferred',
        },
      ],
    };

    const result = reconcile({
      declared,
      observed,
      dispositions: buildpackDisposition,
      environment,
    });

    expect(result.mismatch).toEqual([]);
    expect(result.suppressed).toHaveLength(1);
    expect(result.suppressed[0].result).toBe('mismatch');
    expect(result.suppressed[0].dispositionId).toBe('INV-2026-0005');
  });

  it('suppresses a finding covered by an active disposition but still records it', () => {
    const observed = [
      {
        class: 'service',
        name: 'adam.levin',
        locator: { type: 'cloudFoundryService', value: 'adam.levin' },
      },
    ];

    const result = reconcile({
      declared: [],
      observed,
      dispositions,
      environment,
    });

    expect(result.undocumented).toEqual([]);
    expect(result.suppressed).toHaveLength(1);
    expect(result.suppressed[0].dispositionId).toBe('INV-2026-0007');
  });

  it('does not suppress a finding whose disposition is resolved', () => {
    const observed = [
      { class: 'service', name: 'old', locator: { type: 'cloudFoundryService', value: 'old' } },
    ];
    const resolved = {
      dispositions: [
        {
          id: 'INV-X',
          componentClass: 'service',
          componentName: 'old',
          status: 'resolved',
        },
      ],
    };

    const result = reconcile({
      declared: [],
      observed,
      dispositions: resolved,
      environment,
    });

    expect(result.undocumented).toHaveLength(1);
  });
});

describe('overdueDispositions', () => {
  it('flags an active disposition once its closure target has passed', () => {
    const overdue = overdueDispositions(
      {
        dispositions: [
          {
            id: 'INV-TEST-0001',
            componentName: 'x',
            status: 'deferred',
            closureTarget: '2026-01-01',
          },
        ],
      },
      { now: new Date('2026-06-01') }
    );

    expect(overdue).toEqual([
      { id: 'INV-TEST-0001', componentName: 'x', closureTarget: '2026-01-01' },
    ]);
  });

  it('does not flag a disposition still before its closure target', () => {
    const overdue = overdueDispositions(
      {
        dispositions: [
          {
            id: 'INV-TEST-0002',
            componentName: 'x',
            status: 'deferred',
            closureTarget: '2026-12-01',
          },
        ],
      },
      { now: new Date('2026-06-01') }
    );

    expect(overdue).toEqual([]);
  });

  it('does not flag a resolved disposition even past its closure target', () => {
    const overdue = overdueDispositions(
      {
        dispositions: [
          {
            id: 'INV-TEST-0003',
            componentName: 'x',
            status: 'resolved',
            closureTarget: '2026-01-01',
          },
        ],
      },
      { now: new Date('2026-06-01') }
    );

    expect(overdue).toEqual([]);
  });

  it('finds no overdue dispositions at the initial reconciliation date', () => {
    expect(overdueDispositions(dispositions, { now: new Date('2026-08-10') })).toEqual([]);
  });
});

describe('schemaErrors', () => {
  it('accepts the committed inventory against its schema', () => {
    expect(schemaErrors(inventorySchema, inventory, 'inventory.json')).toEqual([]);
  });

  it('accepts the committed dispositions against their schema', () => {
    expect(schemaErrors(dispositionsSchema, dispositions, 'inventoryDispositions.json')).toEqual(
      []
    );
  });

  it('rejects an inventory component with an invalid tier', () => {
    const invalid = {
      schemaVersion: 1,
      space: { org: 'o', name: 'n', environment: 'prod' },
      components: [
        {
          id: 'app.bad',
          class: 'application',
          name: 'bad',
          description: 'x',
          owner: 'TTA Hub Engineering',
          tier: 'not-a-real-tier',
          locator: { type: 'cloudFoundryApp', value: 'bad' },
          authorization: { type: 'adr', reference: 'x' },
        },
      ],
    };

    const errors = schemaErrors(inventorySchema, invalid, 'inventory.json');

    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toMatch(/inventory\.json schema/);
  });

  it('rejects a repository component without an expected hash', () => {
    const invalid = {
      schemaVersion: 1,
      space: { org: 'o', name: 'n', environment: 'prod' },
      components: [
        {
          id: 'configuration.manifest',
          class: 'configurationArtifact',
          name: 'manifest.yml',
          description: 'x',
          owner: 'TTA Hub Engineering',
          tier: 'reconciled',
          locator: { type: 'repositoryFile', value: 'manifest.yml' },
          authorization: { type: 'adr', reference: 'x' },
        },
      ],
    };

    const errors = schemaErrors(inventorySchema, invalid, 'inventory.json');

    expect(errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/must have required property 'sha256'/)])
    );
  });

  it('rejects an invalid inventory authorization approval date', () => {
    const invalid = {
      ...inventory,
      components: inventory.components.map((component, index) =>
        index === 0
          ? {
              ...component,
              authorization: {
                ...component.authorization,
                approval: {
                  approverRole: 'System Owner',
                  approver: 'Test Approver',
                  approvalDate: 'not-a-date',
                  decision: 'Approved for test coverage',
                },
              },
            }
          : component
      ),
    };

    const errors = schemaErrors(inventorySchema, invalid, 'inventory.json');

    expect(errors).toEqual(
      expect.arrayContaining([expect.stringMatching(/approvalDate.*must match format/)])
    );
  });

  it.each([
    ['a non-none type with the none reference', { type: 'adr', reference: 'none' }],
    [
      'the none type with a resolvable reference',
      { type: 'none', reference: 'docs/adr/0029-release-inventory-baseline-reconciliation.md' },
    ],
  ])('rejects authorization using %s', (_description, authorization) => {
    const invalid = {
      ...inventory,
      components: inventory.components.map((component, index) =>
        index === 0 ? { ...component, authorization } : component
      ),
    };

    expect(schemaErrors(inventorySchema, invalid, 'inventory.json').length).toBeGreaterThan(0);
  });

  it('accepts the none authorization type with the literal none reference', () => {
    const pending = {
      ...inventory,
      components: inventory.components.map((component, index) =>
        index === 0
          ? { ...component, authorization: { type: 'none', reference: 'none' } }
          : component
      ),
    };

    expect(schemaErrors(inventorySchema, pending, 'inventory.json')).toEqual([]);
  });

  it('rejects a disposition missing a required field', () => {
    const invalid = {
      schemaVersion: 1,
      dispositions: [
        {
          id: 'INV-2026-0099',
          componentName: 'x',
          componentClass: 'application',
          finding: 'x',
          status: 'deferred',
          justification: 'x',
          owner: 'x',
          trackingTicket: 'TTAHUB-1',
          // closureTarget intentionally omitted
          recommendation: 'x',
          approval: null,
        },
      ],
    };

    const errors = schemaErrors(dispositionsSchema, invalid, 'inventoryDispositions.json');

    expect(errors.length).toBeGreaterThan(0);
  });

  it.each([
    ['closureTarget', { closureTarget: 'not-a-date' }],
    [
      'approvalDate',
      {
        approval: {
          approverRole: 'System Owner',
          approver: 'Test Approver',
          approvalDate: '2026-02-30',
          decision: 'Approved for test coverage',
        },
      },
    ],
  ])('rejects an invalid %s', (field, override) => {
    const invalid = {
      ...dispositions,
      dispositions: [{ ...dispositions.dispositions[0], ...override }],
    };

    const errors = schemaErrors(dispositionsSchema, invalid, 'inventoryDispositions.json');

    expect(errors).toEqual(
      expect.arrayContaining([expect.stringMatching(new RegExp(`${field}.*must match format`))])
    );
  });
});

describe('validateInventory', () => {
  it('accepts the committed inventory alongside its dispositions', () => {
    expect(validateInventory(inventory, dispositions)).toEqual([]);
  });

  it('rejects a component with no authorization reference and no disposition', () => {
    const undocumentedInventory = {
      space: { environment: 'prod' },
      components: [
        {
          id: 'app.rogue',
          class: 'application',
          name: 'rogue',
          tier: 'reconciled',
          locator: { type: 'cloudFoundryApp', value: 'rogue' },
          authorization: { type: 'none', reference: 'none' },
        },
      ],
    };

    const errors = validateInventory(undocumentedInventory, { dispositions: [] });

    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/no authorization reference/);
  });

  it('rejects duplicate component identifiers', () => {
    const duplicated = {
      space: { environment: 'prod' },
      components: [
        {
          id: 'app.same',
          class: 'application',
          name: 'a',
          tier: 'reconciled',
          locator: { type: 'cloudFoundryApp', value: 'a' },
          authorization: { type: 'adr', reference: 'x' },
        },
        {
          id: 'app.same',
          class: 'application',
          name: 'b',
          tier: 'reconciled',
          locator: { type: 'cloudFoundryApp', value: 'b' },
          authorization: { type: 'adr', reference: 'x' },
        },
      ],
    };

    expect(validateInventory(duplicated, { dispositions: [] })).toEqual([
      'duplicate component id app.same',
    ]);
  });
});

describe('the committed inventory against the recorded production space', () => {
  const declared = selectDeclared(inventory, 'space');
  const observed = deriveSpaceComponents(productionSpaceState, {
    primaryAppName: 'tta-smarthub-prod',
  });
  const result = reconcile({
    declared,
    observed,
    dispositions,
    environment: 'prod',
  });

  it('leaves no undocumented component once dispositions are applied', () => {
    expect(result.undocumented).toEqual([]);
  });

  it('leaves no missing component', () => {
    expect(result.missing).toEqual([]);
  });

  it('leaves no unsuppressed mismatch, since the recorded fixture matches declared plans, instance counts, and buildpack version', () => {
    expect(result.mismatch).toEqual([]);
  });

  it('suppresses only the findings the first reconciliation raised', () => {
    expect(result.suppressed.map((s) => s.dispositionId).sort()).toEqual([
      'INV-2026-0003',
      'INV-2026-0004',
      'INV-2026-0007',
    ]);
  });

  /**
   * During incident response the primary hostname is remapped to the
   * maintenance page application. That is a legitimate operational state, so it
   * must not read as drift. Route identity is the hostname; destinations are
   * recorded but deliberately not compared.
   */
  it('stays clean while the primary hostname is remapped for maintenance', () => {
    const duringMaintenance = {
      ...productionSpaceState,
      routes: productionSpaceState.routes.map((route) =>
        route.url === 'ttahub.ohs.acf.hhs.gov'
          ? { ...route, destinations: [{ app: { guid: 'app-5' } }] }
          : route
      ),
    };

    const maintenanceResult = reconcile({
      declared,
      observed: deriveSpaceComponents(duringMaintenance, {
        primaryAppName: 'tta-smarthub-prod',
      }),
      dispositions,
      environment: 'prod',
    });

    expect(maintenanceResult.undocumented).toEqual([]);
    expect(maintenanceResult.missing).toEqual([]);
  });
});
