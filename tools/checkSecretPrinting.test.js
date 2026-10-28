const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const {
  CheckError,
  ExceptionsError,
  applyExceptions,
  checkRepository,
  formatReport,
  loadExceptions,
  main,
  scanText,
} = require('./checkSecretPrinting');

// Fixtures reference variable names only. None contains a real secret value.
const rules = (text) => scanText('script.sh', text).map((violation) => violation.rule);
const yamlRules = (text) =>
  scanText('.circleci/config.yml', text).map((violation) => `${violation.line}:${violation.rule}`);

describe('checkSecretPrinting scanText', () => {
  describe('env-dump', () => {
    it.each([
      'env',
      'env | sort',
      'env > /tmp/out',
      'echo "env:" "$(env)" >&2',
      'result=`env`',
      'printenv',
      'printenv HOME',
      'if true; then env; fi',
      'export -p',
      'cat /proc/self/environ',
      'DEBUG=1 env',
      'command printenv',
      'if printenv; then :; fi',
      'FOO=bar printenv HOME',
      'exec env',
      'while true; do env; done',
      'DEBUG=1 FOO=bar env | sort',
    ])('flags %s', (line) => {
      expect(rules(line)).toContain('env-dump');
    });

    it.each([
      '#!/usr/bin/env bash',
      'env FOO=bar ./run.sh',
      'env -i ./run.sh',
      'echo "check the env before running"',
      'const value = process.env.NODE_ENV',
      'cf env-var-list-example',
      'export EXAMPLE_VALUE=1',
      '# env',
      'run_env=$(pwd) # env | sort',
      'DEBUG=1 env FOO=bar ./run.sh',
      'command -v env',
      'if [ -x "$(command -v env)" ]; then true; fi',
      'FOO=bar ./env.sh',
    ])('allows %s', (line) => {
      expect(rules(line)).not.toContain('env-dump');
    });
  });

  describe('cf-env', () => {
    it('flags cf env that is not captured', () => {
      expect(rules('cf env my-app')).toContain('cf-env');
      expect(rules('cf env my-app | grep LOCK_APP')).toContain('cf-env');
    });

    it('allows cf env captured into a variable', () => {
      expect(rules('LOCK_DATA=$(cf env "$APP_NAME" | grep -A 10 LOCK_APP)')).toEqual([]);
      expect(rules('  local lock_data=$(cf env "$APP_NAME")')).toEqual([]);
    });
  });

  describe('shell-trace', () => {
    it.each([
      'set -x',
      'set -ex',
      'set -euxo pipefail',
      'set -o xtrace',
      'set -e -o xtrace',
      'bash -x ./script.sh',
      'sh -ex ./script.sh',
      'true && set -x',
      'set -e -x',
      'set -e -u -x',
      'set -eu -x',
      'set -o pipefail -x',
      'set -eo pipefail -x',
      'set -e -o xtrace',
      'set -euo pipefail -x',
    ])('flags %s', (line) => {
      expect(rules(line)).toContain('shell-trace');
    });

    it('flags a shebang that enables tracing, but only on the first line', () => {
      expect(rules('#!/bin/bash -x\necho hi')).toContain('shell-trace');
      expect(rules('#!/usr/bin/env bash -x\necho hi')).toContain('shell-trace');
      expect(rules('echo hi\n#!/bin/bash -x')).not.toContain('shell-trace');
    });

    it.each([
      'set +x',
      'set -e',
      'set -euo pipefail',
      'set -o pipefail',
      'set -e -u',
      'set -e +x',
      'set -eo pipefail',
      'set -e -o pipefail',
      '#!/bin/bash',
      '#!/usr/bin/env bash',
      'echo "run bash -x to debug"',
      '#set -x',
      '    # set -x',
      'echo hi # set -x',
    ])('allows %s', (line) => {
      expect(rules(line)).not.toContain('shell-trace');
    });
  });

  describe('print-secret', () => {
    it.each([
      'echo "$DATABASE_URL"',
      'echo ${VCAP_SERVICES}',
      'echo "value: $EXAMPLE_PASSWORD"',
      'echo "$db_password" >&2',
      'printf "%s\\n" "$API_TOKEN"',
      'echo "key is ${SECRET_KEY}"',
      'echo ok && echo "$VCAP_APPLICATION"',
      'echo "$AWS_SECRET_ACCESS_KEY" | tee out.txt',
    ])('flags %s', (line) => {
      expect(rules(line)).toContain('print-secret');
    });

    it.each([
      'echo "DATABASE_URL is required"',
      'echo "token length: ${#API_TOKEN}"',
      'echo "set: ${API_TOKEN:+yes}"',
      "echo '$EXAMPLE_PASSWORD'",
      'echo "Creating service key ${service_key_name}"',
      'echo "$TOKEN_FILE_PATH"',
      'echo "$SECRET_ID"',
      'cf login -p "$EXAMPLE_PASSWORD"',
      'curl -H "Authorization: Bearer $API_TOKEN" https://example.test',
      'export DATABASE_URL="$EXAMPLE_PASSWORD"',
      'echo "$HOME"',
      '# echo "$EXAMPLE_PASSWORD"',
      'echo "hi" # $EXAMPLE_PASSWORD',
    ])('allows %s', (line) => {
      expect(rules(line)).not.toContain('print-secret');
    });
  });

  describe('inline and block commands in CircleCI YAML', () => {
    it.each([
      ['- run: env', '1:env-dump'],
      ['- run: set -x', '1:shell-trace'],
      ['- run: echo "$EXAMPLE_PASSWORD"', '1:print-secret'],
      ['    command: env', '1:env-dump'],
      ['    command: set -x', '1:shell-trace'],
      ['    command: "set -x"', '1:shell-trace'],
      ['    command: \'echo "$EXAMPLE_PASSWORD"\'', '1:print-secret'],
      ['    command: "echo \\"$EXAMPLE_PASSWORD\\""', '1:print-secret'],
      ['- run: env # trailing comment', '1:env-dump'],
      ['- run: cf env my-app', '1:cf-env'],
      ['        - run: printenv', '1:env-dump'],
    ])('flags %s', (line, expected) => {
      expect(yamlRules(line)).toEqual([expected]);
    });

    it('scans the lines of a block scalar and reports their real line numbers', () => {
      const yaml = [
        'jobs:',
        '  a:',
        '    steps:',
        '    - run:',
        '        name: check',
        '        command: |',
        '          echo "ok"',
        '          set -x',
        '          echo "$EXAMPLE_PASSWORD"',
        '    - run: |',
        '        env',
      ].join('\n');

      expect(yamlRules(yaml)).toEqual(['8:shell-trace', '9:print-secret', '11:env-dump']);
    });

    it('stops scanning a block scalar when the indentation ends', () => {
      const yaml = [
        '    - run:',
        '        command: |',
        '          echo "ok"',
        '        name: set -x',
        '    - checkout',
      ].join('\n');

      expect(yamlRules(yaml)).toEqual([]);
    });

    it('does not scan YAML values that are not commands', () => {
      const yaml = [
        'parameters:',
        '  the_command:',
        '    type: string',
        '    description: "echo $EXAMPLE_PASSWORD"',
        '    default: env',
        '- run:',
        '    name: set -x',
        '    command: echo ok',
      ].join('\n');

      expect(yamlRules(yaml)).toEqual([]);
    });

    describe('folded block scalars (command: >)', () => {
      it('joins folded lines the way YAML does before scanning', () => {
        const yaml = [
          '    - run:',
          '        command: >',
          '          echo',
          '          "$EXAMPLE_PASSWORD"',
        ].join('\n');

        expect(yamlRules(yaml)).toEqual(['3:print-secret']);
      });

      it.each([
        ['command: >-', ['set', '-x'], '3:shell-trace'],
        ['command: >+', ['printenv'], '3:env-dump'],
        ['command: >2', ['echo', '"$DATABASE_URL"'], '3:print-secret'],
      ])('flags %s', (key, lines, expected) => {
        const yaml = [
          '    - run:',
          `        ${key}`,
          ...lines.map((line) => `          ${line}`),
        ].join('\n');

        expect(yamlRules(yaml)).toEqual([expected]);
      });

      it('does not join lines of a literal block (|), which are separate commands', () => {
        const yaml = [
          '    - run:',
          '        command: |',
          '          echo',
          '          "$EXAMPLE_PASSWORD"',
        ].join('\n');

        expect(yamlRules(yaml)).toEqual([]);
      });

      it('does not fold across a blank line or into a more-indented line', () => {
        const blank = ['command: >', '  echo', '', '  "$EXAMPLE_PASSWORD"'].join('\n');
        const indented = ['command: >', '  echo', '    "$EXAMPLE_PASSWORD"'].join('\n');

        expect(yamlRules(blank)).toEqual([]);
        expect(yamlRules(indented)).toEqual([]);
      });

      it('still ends the block at the next key', () => {
        const yaml = ['command: >', '  echo ok', 'name: set -x'].join('\n');

        expect(yamlRules(yaml)).toEqual([]);
      });
    });

    it('allows safe inline commands', () => {
      expect(yamlRules('- run: echo "length ${#EXAMPLE_TOKEN}"')).toEqual([]);
      expect(yamlRules('- run: node ./tools/checkSecretPrinting.js')).toEqual([]);
      expect(yamlRules('- run: # env')).toEqual([]);
    });
  });

  describe('control prefixes and continued commands', () => {
    it.each([
      'if true; then echo "$EXAMPLE_PASSWORD"; fi',
      'if true; then\n  echo "$EXAMPLE_PASSWORD"\nfi',
      'while read line; do echo "$EXAMPLE_PASSWORD"; done',
      '{ echo "$EXAMPLE_PASSWORD"; }',
      '( echo "$EXAMPLE_PASSWORD" )',
      '! echo "$EXAMPLE_PASSWORD"',
      'test -n "$X" && echo "$EXAMPLE_PASSWORD"',
      'FOO=bar echo "$EXAMPLE_PASSWORD"',
      'show() { echo "$EXAMPLE_PASSWORD"; }',
      'case "$mode" in\n  debug) echo "$EXAMPLE_PASSWORD" ;;\nesac',
      'echo \\\n  "$EXAMPLE_PASSWORD"',
      'echo "first" \\\n  "$EXAMPLE_PASSWORD"',
    ])('flags secret printing in %j', (text) => {
      expect(rules(text)).toContain('print-secret');
    });

    it.each([
      'if true; then echo "length ${#EXAMPLE_PASSWORD}"; fi',
      'result=$(echo "$EXAMPLE_PASSWORD")',
      'if true; then echo "no secret here"; fi',
      'echo \\\n  "no secret here"',
      'echo \\\n  "length ${#EXAMPLE_PASSWORD}"',
    ])('allows %j', (text) => {
      expect(rules(text)).not.toContain('print-secret');
    });

    it('applies the other rules to joined continuation lines', () => {
      expect(rules('set \\\n  -x')).toContain('shell-trace');
      expect(rules('printenv \\\n  HOME')).toContain('env-dump');
    });

    it('reports a continued command at its first line, with the joined text', () => {
      expect(scanText('a.sh', 'echo hi\necho \\\n  "$EXAMPLE_PASSWORD"\n')).toEqual([
        { file: 'a.sh', line: 2, rule: 'print-secret', text: 'echo "$EXAMPLE_PASSWORD"' },
      ]);
    });

    it('does not treat a comment ending in a backslash as a continuation', () => {
      const violations = scanText('a.sh', '# note \\\necho "$EXAMPLE_PASSWORD"\n');

      expect(violations.map((v) => v.line)).toEqual([2]);
    });
  });

  describe('cf env is judged per invocation', () => {
    it.each([
      'DATA=$(cf env app); cf env app',
      'cf env app; DATA=$(cf env app)',
      'DATA=$(cf env app) && cf env app | grep VCAP',
      'echo $(cf env app)',
      'echo "$(cf env app)"',
      'cf env app > out.txt',
      'echo DATA=$(cf env app)',
      'echo DATA=`cf env app`',
      "printf '%s' DATA=$(cf env app)",
      'echo prefix OTHER=$(cf env app)',
    ])('flags %s', (line) => {
      expect(rules(line)).toContain('cf-env');
    });

    it.each([
      'DATA=$(cf env app)',
      'DATA=$(cf env app); OTHER=$(cf env other)',
      'LOCK_DATA=$(cf env "$APP_NAME" | grep -A 10 LOCK_APP | sed "s/x/y/")',
      'DATA=`cf env app`',
      'local data=$(cf env app)',
      'export DATA=$(cf env app)',
      'A=1 B=$(cf env app)',
      'declare -x DATA=$(cf env app)',
      'cmd; DATA=$(cf env app)',
      'if true; then DATA=$(cf env app); fi',
    ])('allows %s', (line) => {
      expect(rules(line)).not.toContain('cf-env');
    });
  });

  it('reports line numbers and keeps the source text for exception matching', () => {
    const violations = scanText('a.sh', 'echo hi\n  set -x  \n');

    expect(violations).toEqual([{ file: 'a.sh', line: 2, rule: 'shell-trace', text: 'set -x' }]);
  });
});

describe('checkSecretPrinting repository scan', () => {
  let root;

  const write = (file, contents) => {
    const absolute = path.join(root, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents);
  };

  beforeEach(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-printing-'));
  });

  afterEach(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('passes a clean repository', () => {
    write('automation/ok.sh', '#!/bin/bash\nset -euo pipefail\necho "length: ${#EXAMPLE_TOKEN}"\n');
    write('bin/tool', '#!/usr/bin/env bash\necho hello\n');
    write('.circleci/config.yml', 'jobs:\n  a:\n    steps:\n    - run: echo "$HOME"\n');

    const result = checkRepository({ root });

    expect(result.violations).toEqual([]);
    expect(result.unusedExceptions).toEqual([]);
  });

  it('fails on prohibited commands in automation/, bin/ and the CircleCI config', () => {
    write('automation/nested/bad.sh', '#!/bin/bash\nenv\n');
    write('bin/traced', '#!/bin/bash -x\necho hi\n');
    write('.circleci/config.yml', 'steps:\n- run: |\n    echo "$EXAMPLE_PASSWORD"\n');

    const { violations } = checkRepository({ root });

    expect(violations.map((v) => `${v.file}:${v.line}:${v.rule}`).sort()).toEqual([
      '.circleci/config.yml:3:print-secret',
      'automation/nested/bad.sh:2:env-dump',
      'bin/traced:1:shell-trace',
    ]);
  });

  it('ignores files outside the scanned paths and non-shell files', () => {
    write('src/other.sh', '#!/bin/bash\nenv\n');
    write('bin/notes.md', 'run `env` to see\nset -x\n');
    write('bin/script.js', 'console.log(process.env.NODE_ENV);\nenv\n');
    write('automation/node_modules/pkg/run.sh', '#!/bin/bash\nenv\n');

    expect(checkRepository({ root }).violations).toEqual([]);
  });

  it('does not scan commented examples', () => {
    write('bin/commented.sh', '#!/bin/bash\n#set -x\n# echo "$EXAMPLE_PASSWORD"\n');

    expect(checkRepository({ root }).violations).toEqual([]);
  });

  describe('exceptions', () => {
    const exceptionsFile = (exceptions) =>
      write('tools/secretPrintingExceptions.json', JSON.stringify({ exceptions }));
    const validException = {
      file: 'bin/traced',
      rule: 'shell-trace',
      text: '#!/bin/bash -x',
      justification: 'Runs only fixed non-secret commands in CI; no credential variables.',
      ticket: 'TTAHUB-0000',
    };

    it('allows a violation covered by a scoped exception', () => {
      write('bin/traced', '#!/bin/bash -x\necho hi\n');
      exceptionsFile([validException]);

      const result = checkRepository({ root });

      expect(result.violations).toEqual([]);
      expect(result.unusedExceptions).toEqual([]);
    });

    it('does not cover a different file, rule, or edited line', () => {
      write('bin/traced', '#!/bin/bash -x\necho hi\n');
      write('bin/other', '#!/bin/bash -x\n');
      write('bin/edited', '#!/bin/bash -xe\n');
      exceptionsFile([validException]);

      const files = checkRepository({ root }).violations.map((v) => v.file);

      expect(files.sort()).toEqual(['bin/edited', 'bin/other']);
    });

    it('reports exceptions that no longer match any line', () => {
      write('bin/traced', '#!/bin/bash\necho hi\n');
      exceptionsFile([validException]);

      const result = checkRepository({ root });

      expect(result.violations).toEqual([]);
      expect(result.unusedExceptions).toEqual([validException]);
    });

    it.each([
      ['file', { file: '' }],
      ['justification', { justification: undefined }],
      ['ticket', { ticket: undefined }],
      ['text', { text: undefined }],
    ])('rejects an exception missing %s', (field, override) => {
      exceptionsFile([{ ...validException, ...override }]);

      expect(() => loadExceptions(root)).toThrow(`missing "${field}"`);
    });

    it('rejects an unknown rule and a token justification', () => {
      exceptionsFile([{ ...validException, rule: 'not-a-rule' }]);
      expect(() => loadExceptions(root)).toThrow('unknown rule');

      exceptionsFile([{ ...validException, justification: 'ok' }]);
      expect(() => loadExceptions(root)).toThrow('real justification');
    });

    it('rejects an invalid exceptions file', () => {
      write('tools/secretPrintingExceptions.json', '{ not json');
      expect(() => loadExceptions(root)).toThrow(ExceptionsError);

      write('tools/secretPrintingExceptions.json', '{}');
      expect(() => loadExceptions(root)).toThrow('"exceptions" array');
    });

    it('applyExceptions matches on file, rule and trimmed text', () => {
      const violation = {
        file: 'bin/traced',
        line: 9,
        rule: 'shell-trace',
        text: '#!/bin/bash -x',
      };

      expect(applyExceptions([violation], [validException]).remaining).toEqual([]);
    });
  });

  describe('diagnostics', () => {
    it('explains the rule and the exception process without printing the offending line', () => {
      write('bin/leaky.sh', '#!/bin/bash\necho "FIXTURE_MARKER_NOT_PRINTED $EXAMPLE_PASSWORD"\n');

      const report = formatReport(checkRepository({ root }));

      expect(report).toContain('bin/leaky.sh:2 [print-secret]');
      expect(report).toContain('public');
      expect(report).toContain('request an exception');
      expect(report).toContain('tools/secretPrintingExceptions.json');
      expect(report).not.toContain('FIXTURE_MARKER_NOT_PRINTED');
      expect(report).not.toContain('EXAMPLE_PASSWORD');
    });

    it('main exits 1 with a report on failure and 0 on success', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
      write('bin/leaky.sh', '#!/bin/bash\nenv\n');

      expect(main(['--root', root])).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('bin/leaky.sh:2 [env-dump]'));

      write('bin/leaky.sh', '#!/bin/bash\necho ok\n');

      expect(main(['--root', root])).toBe(0);
      expect(logSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
      logSpy.mockRestore();
    });

    it('main exits 1 for an invalid exceptions file', () => {
      const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      write('tools/secretPrintingExceptions.json', '{ not json');

      expect(main(['--root', root])).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('not valid JSON'));
      errorSpy.mockRestore();
    });
  });
});

describe('checkSecretPrinting --staged (reads the git index, not the working tree)', () => {
  let repoDir;

  const git = (...args) =>
    execFileSync(
      'git',
      [
        '-c',
        'user.name=test',
        '-c',
        'user.email=test@example.com',
        '-c',
        'commit.gpgsign=false',
        ...args,
      ],
      { cwd: repoDir, encoding: 'utf8' }
    ).trim();

  const write = (file, contents) => {
    const absolute = path.join(repoDir, file);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, contents);
  };

  const staged = () => checkRepository({ root: repoDir, staged: true });
  const workingTree = () => checkRepository({ root: repoDir });
  const files = (result) => result.violations.map((violation) => violation.file);

  const exception = (file, text) => ({
    file,
    rule: 'shell-trace',
    text,
    justification: 'Runs only fixed non-secret commands in CI; no credential variables.',
    ticket: 'TTAHUB-0000',
  });
  const exceptionsJson = (...exceptions) => JSON.stringify({ exceptions });

  beforeEach(() => {
    repoDir = fs.mkdtempSync(path.join(os.tmpdir(), 'secret-printing-staged-'));
    git('init', '-q');
    write('README.md', 'base\n');
    git('add', '-A');
    git('commit', '-q', '-m', 'base');
  });

  afterEach(() => {
    fs.rmSync(repoDir, { recursive: true, force: true });
  });

  it('flags a violation that is staged', () => {
    write('bin/leaky.sh', '#!/bin/bash\nenv\n');
    git('add', 'bin/leaky.sh');

    expect(files(staged())).toEqual(['bin/leaky.sh']);
  });

  it('ignores a violation that is only in the working tree', () => {
    write('bin/leaky.sh', '#!/bin/bash\nenv\n');

    expect(files(workingTree())).toEqual(['bin/leaky.sh']);
    expect(files(staged())).toEqual([]);
  });

  it('judges the staged content when the working tree has since changed', () => {
    write('bin/script.sh', '#!/bin/bash\nenv\n');
    git('add', 'bin/script.sh');
    write('bin/script.sh', '#!/bin/bash\necho clean\n');
    expect(files(staged())).toEqual(['bin/script.sh']);

    git('add', 'bin/script.sh');
    write('bin/script.sh', '#!/bin/bash\nenv\n');
    git('commit', '-q', '-m', 'script');
    git('rm', '-q', '--cached', 'bin/script.sh');
    expect(files(staged())).toEqual([]);
  });

  it('honors an exception only when the exception is staged', () => {
    write('bin/traced.sh', '#!/bin/bash -x\n');
    git('add', 'bin/traced.sh');
    write(
      'tools/secretPrintingExceptions.json',
      exceptionsJson(exception('bin/traced.sh', '#!/bin/bash -x'))
    );

    expect(files(staged())).toEqual(['bin/traced.sh']);

    git('add', 'tools/secretPrintingExceptions.json');
    expect(staged().violations).toEqual([]);
  });

  it('ignores an exception edit that is not staged', () => {
    write('bin/traced.sh', '#!/bin/bash -x\n');
    write(
      'tools/secretPrintingExceptions.json',
      exceptionsJson(exception('bin/traced.sh', '#!/bin/bash -x'))
    );
    git('add', 'bin/traced.sh', 'tools/secretPrintingExceptions.json');
    write('tools/secretPrintingExceptions.json', exceptionsJson());

    expect(staged().violations).toEqual([]);
    expect(workingTree().violations.map((v) => v.file)).toEqual(['bin/traced.sh']);
  });

  it('does not report a staged exception as unused when its file is staged', () => {
    write('bin/traced.sh', '#!/bin/bash -x\n');
    write(
      'tools/secretPrintingExceptions.json',
      exceptionsJson(exception('bin/traced.sh', '#!/bin/bash -x'))
    );
    git('add', '-A');

    expect(staged().unusedExceptions).toEqual([]);
  });

  it('does not scan staged files outside the scanned paths', () => {
    write('src/other.sh', '#!/bin/bash\nenv\n');
    git('add', 'src/other.sh');

    expect(staged().violations).toEqual([]);
  });

  it('main --staged exits 1 on a staged violation and 0 otherwise', () => {
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    write('bin/leaky.sh', '#!/bin/bash\nenv\n');

    expect(main(['--root', repoDir, '--staged'])).toBe(0);

    git('add', 'bin/leaky.sh');
    expect(main(['--root', repoDir, '--staged'])).toBe(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('bin/leaky.sh:2 [env-dump]'));
    errorSpy.mockRestore();
    logSpy.mockRestore();
  });

  it('fails closed with a sanitized error outside a git repository', () => {
    const notRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'not-a-repo-'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect(() => checkRepository({ root: notRepo, staged: true })).toThrow(CheckError);
      expect(main(['--root', notRepo, '--staged'])).toBe(1);
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('git ls-files failed'));
    } finally {
      errorSpy.mockRestore();
      fs.rmSync(notRepo, { recursive: true, force: true });
    }
  });
});
