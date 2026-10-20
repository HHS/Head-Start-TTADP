// Runs the real Biome binary with the noRandomTestIds plugin against a fixture in a temp
// directory, so the fixture's intentional violations never reach the repo's own lint run.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '../..');
const biomeBin = path.join(repoRoot, 'node_modules/.bin/biome');
const pluginPath = path.join(__dirname, 'noRandomTestIds.grit');

// Every line ends in `// flag` or `// ok`; the plugin should report exactly the `flag` lines.
const fixture = `import { faker } from '@faker-js/faker';
const a = { id: faker.number.int({ min: 0, max: 99999 }) }; // flag
const b = { userId: faker.number.int({ min: 1, max: 10 }) }; // flag
const recipientId = faker.number.int({ min: 1000, max: 1000 + 99999 }); // flag
let grantIds = [faker.number.int({ min: 1, max: 9 }), faker.number.int({ min: 1, max: 9 })]; // flag
const RECIPIENT_ID = faker.number.int({ min: 900, max: 900 + 99999 }); // flag
const c = { id: fakerUnique(() => faker.number.int({ min: 1, max: 9 })) }; // flag
const d = { eventId: \`R01-TR-\${faker.number.int({ max: 4 })}\` }; // flag
let reportId; // ok
reportId = faker.number.int({ min: 1, max: 9 }); // flag
function make(ownerId = faker.number.int({ min: 1, max: 9 })) { return ownerId; } // flag
const e = { numberOfParticipants: faker.number.int({ min: 1, max: 20 }) }; // ok
const f = { duration: faker.number.int({ min: 1, max: 9 }) }; // ok
const ordinal = faker.number.int({ min: 1, max: 9 }); // ok
const name = \`recipient\${faker.number.int({ min: 1, max: 9 })}\`; // ok
const g = { idle: faker.number.int({ min: 1, max: 9 }) }; // ok
const h = { id: uniqueTestId(), count: faker.number.int({ min: 1, max: 9 }) }; // ok
`;

const linesMarked = (marker) =>
  fixture
    .split('\n')
    .map((line, index) => (line.endsWith(`// ${marker}`) ? index + 1 : null))
    .filter((line) => line !== null);

describe('noRandomTestIds biome plugin', () => {
  let tmpDir;

  beforeAll(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'no-random-test-ids-'));
    fs.writeFileSync(
      path.join(tmpDir, 'biome.json'),
      JSON.stringify({
        vcs: { enabled: false },
        plugins: [pluginPath],
        linter: { rules: { recommended: false } },
      })
    );
    fs.writeFileSync(path.join(tmpDir, 'fixture.test.js'), fixture);
  });

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('reports random faker numbers used as ids and nothing else', () => {
    const result = spawnSync(biomeBin, ['lint', '--max-diagnostics=100', 'fixture.test.js'], {
      cwd: tmpDir,
      encoding: 'utf8',
    });
    const output = `${result.stdout}${result.stderr}`;

    const reported = [...output.matchAll(/fixture\.test\.js:(\d+):\d+ plugin/g)].map((match) =>
      Number(match[1])
    );

    expect([...new Set(reported)].sort((x, y) => x - y)).toEqual(linesMarked('flag'));
    expect(output).toContain('Use uniqueTestId() from src/fakerUnique');
  });
});
