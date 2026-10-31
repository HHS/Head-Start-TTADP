#!/usr/bin/env node

/* eslint-disable no-console */
// Static check for shell commands that print the environment or secret values.
//
// CircleCI job logs for this project are publicly readable, so a command that dumps the
// environment (or echoes a credential) publishes it. This happened in TTAHUB-5932, where an
// `env` dump in automation/nodejs/scripts/run.sh exposed a database credential. The check
// reads shell scripts under automation/ and bin/ plus the CircleCI config and fails on:
//
//   env-dump       env, printenv, export -p, or /proc/*/environ writing the environment out
//   cf-env         `cf env`, which prints the whole VCAP_SERVICES block, unless captured
//   shell-trace    set -x / set -o xtrace / a -x shebang / `bash -x`, which print expanded values
//   print-secret   echo or printf of DATABASE_URL, VCAP_*, or a variable named *PASSWORD*,
//                  *SECRET*, *TOKEN* or *KEY*
//
// Its diagnostics never include the text of the matching line, because that line could itself
// contain a secret. See docs/guides/circle-ci.md for how to request an exception. With --staged it
// reads the git index instead of the working tree (used by .githooks/pre-commit).
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const SCAN_TARGETS = ['automation', 'bin', '.circleci/config.yml'];
const DEFAULT_EXCEPTIONS_PATH = 'tools/secretPrintingExceptions.json';
const SKIPPED_DIRECTORIES = new Set(['node_modules', '.git']);
const MAX_FILE_BYTES = 1024 * 1024;
const GIT_MAX_BUFFER = 64 * 1024 * 1024;
const MIN_JUSTIFICATION_LENGTH = 20;

const SENSITIVE_NAME =
  '[A-Za-z0-9_]*(?:PASSWORD|PASSWD|SECRET|TOKEN|KEY)[A-Za-z0-9_]*|DATABASE_URL|POSTGRES_URL|VCAP_[A-Z_]+';
const SENSITIVE_NAME_PATTERN = new RegExp(`^(?:${SENSITIVE_NAME})$`, 'i');
// A variable that names, locates or counts something rather than holding it is not a secret,
// for example service_key_name, SECRET_FILE_PATH or TOKEN_ID. These suffixes are not flagged.
const METADATA_SUFFIX = /_(?:NAME|NAMES|PATH|FILE|DIR|ID|COUNT|LENGTH)$/i;
const isSensitiveName = (name) => SENSITIVE_NAME_PATTERN.test(name) && !METADATA_SUFFIX.test(name);

const RULES = {
  'env-dump': {
    why: 'prints every environment variable, including credentials, into the job log',
    fix: 'print only the specific non-secret variables you need, by name',
  },
  'cf-env': {
    why: '`cf env` prints the whole application environment, including VCAP_SERVICES credentials',
    fix: 'capture it in a variable (VAR=$(cf env APP | ...)) and print only a non-secret field',
  },
  'shell-trace': {
    why: 'shell tracing prints every command with its variables expanded, including secrets',
    fix: 'remove the tracing, or log specific non-secret values with echo',
  },
  'print-secret': {
    why: 'echo/printf of a secret-named variable or connection string writes its value into the log',
    fix: 'print only its length (${#VAR}) or whether it is set (${VAR:+set}), never the value',
  },
};

// A command starts at the beginning of a line or after ; & | ( { ` $( or a keyword such as
// then/do. This keeps prose inside echo strings and `#!/usr/bin/env bash` from matching.
const COMMAND_START = '(?:^|[;&|({`]|\\$\\(|\\b(?:then|do|else)\\b)\\s*';

const ENV_DUMP_PATTERNS = [
  new RegExp(`${COMMAND_START}env\\s*(?=$|[|;&>)\`]|\\d>)`),
  new RegExp(`${COMMAND_START}printenv\\b`),
  new RegExp(`${COMMAND_START}export\\s+-p\\b`),
  /\/proc\/[^\s/]+\/environ\b/,
];

// `set` takes any number of option groups, so tracing can follow others: `set -e -x`, `set -eu -x`,
// `set -o pipefail -x`. A group is -abc / +abc, or -o NAME / -eo NAME (an option with its argument).
const SET_OPTION_GROUP = '(?:[-+][a-zA-Z]*o\\s+[A-Za-z]+|[-+][a-zA-Z]+)\\s+';
const SET_TRACE = new RegExp(
  `${COMMAND_START}set\\s+(?:${SET_OPTION_GROUP})*(?:-[a-zA-Z]*x[a-zA-Z]*|-[a-zA-Z]*o\\s+xtrace)\\b`
);
const SHELL_TRACE_INVOCATION = new RegExp(
  `${COMMAND_START}(?:ba|da|z|k)?sh\\s+(?:-[a-zA-Z]+\\s+)*-[a-zA-Z]*x`
);
const TRACE_SHEBANG = /^#!\s*\S+(?:\s+\S+)*?\s-[a-zA-Z]*x/;

const CF_ENV = /(?:^|[\s;&|({`])cf\s+env\b/g;
// What may precede the `$(` of a captured command substitution, within its own simple command: an
// optional declaration keyword, any number of VAR=value assignments, then the VAR= that receives the
// output. Anything else (for example `echo DATA=$(...)`, where DATA= is just an argument) is not capture.
const ASSIGNMENT_PREFIX =
  /^\s*(?:(?:local|export|readonly|declare)\s+(?:-[a-zA-Z]+\s+)*)?(?:[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s+)*[A-Za-z_][A-Za-z0-9_]*=$/;
const COMMAND_SEPARATOR = /[;&|({`]|\b(?:then|do|else)\b/g;

const capturesIntoAssignment = (before) => {
  let start = 0;
  for (const separator of before.matchAll(COMMAND_SEPARATOR)) {
    start = separator.index + separator[0].length;
  }
  return ASSIGNMENT_PREFIX.test(before.slice(start));
};

// True when the `cf env` at `index` sits inside a command substitution that is assigned to a
// variable, i.e. VAR=$(... cf env ...) or VAR=`... cf env ...`, so its output is captured, not printed.
const isCapturedByAssignment = (code, index) => {
  let depth = 0;
  for (let i = index - 1; i >= 0; i -= 1) {
    if (code[i] === ')') {
      depth += 1;
    } else if (code[i] === '(') {
      if (depth === 0) {
        return code[i - 1] === '$' && capturesIntoAssignment(code.slice(0, i - 1));
      }
      depth -= 1;
    }
  }
  const before = code.slice(0, index);
  if ((before.match(/`/g) || []).length % 2 === 1) {
    return capturesIntoAssignment(code.slice(0, before.lastIndexOf('`')));
  }
  return false;
};

// Each `cf env` is judged on its own, so a captured one cannot excuse an uncaptured one on the same line.
const hasUncapturedCfEnv = (code) =>
  [...code.matchAll(CF_ENV)].some(
    (match) => !isCapturedByAssignment(code, match.index + match[0].search(/cf/))
  );

// Returns the part of the line that is code. A `#` that starts a comment (at the start of a
// line or after whitespace, outside quotes) and everything after it is dropped, so commented
// examples are not scanned. The shebang on line 1 is handled separately.
const stripComment = (line) => {
  let quote = null;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (quote) {
      if (char === '\\' && quote === '"') {
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === '\\') {
      i += 1;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i);
    }
  }
  return line;
};

// Splits code into simple commands on ; & | and && / || that are outside quotes.
const splitCommands = (code) => {
  const commands = [];
  let quote = null;
  let current = '';
  for (let i = 0; i < code.length; i += 1) {
    const char = code[i];
    if (quote) {
      current += char;
      if (char === '\\' && quote === '"') {
        i += 1;
        current += code[i] || '';
      } else if (char === quote) {
        quote = null;
      }
    } else if (char === '"' || char === "'") {
      quote = char;
      current += char;
    } else if (char === '\\') {
      current += char + (code[i + 1] || '');
      i += 1;
    } else if (char === ';' || char === '&' || char === '|') {
      commands.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  commands.push(current);
  return commands;
};

// Variable references that the shell would expand, i.e. not inside single quotes. References
// to a variable's length (${#VAR}) or to a ${VAR:+word} test do not reveal the value.
const expandedReferences = (command) => {
  const names = [];
  let quote = null;
  for (let i = 0; i < command.length; i += 1) {
    const char = command[i];
    if (quote === "'") {
      if (char === "'") {
        quote = null;
      }
    } else if (char === '\\') {
      i += 1;
    } else if (char === "'" && quote === null) {
      quote = "'";
    } else if (char === '"') {
      quote = quote === '"' ? null : '"';
    } else if (char === '$') {
      const rest = command.slice(i + 1);
      const braced = rest.match(/^\{([A-Za-z_][A-Za-z0-9_]*)(:?\+)?/);
      const plain = rest.match(/^([A-Za-z_][A-Za-z0-9_]*)/);
      if (braced) {
        if (!braced[2]) {
          names.push(braced[1]);
        }
      } else if (plain) {
        names.push(plain[1]);
      }
    }
  }
  return names;
};

// Strips the shell constructs that can precede a command (if/then/do, `{`, `(`, `!`, a function
// or case-arm header, leading VAR=value assignments) so `if x; then echo "$VAR"; fi` is seen as echo.
const normalizeCommand = (fragment) => {
  let command = fragment;
  for (let pass = 0; pass < 10; pass += 1) {
    const next = command
      .replace(/^\s+/, '')
      .replace(/^(?:if|elif|then|else|do|while|until|time|command|builtin|exec|function)\s+/, '')
      .replace(/^[!{}()]\s*/, '')
      .replace(/^[A-Za-z_][A-Za-z0-9_]*\(\)\s*/, '')
      .replace(/^[^\s=()'"]+\)\s*/, '')
      .replace(/^[A-Za-z_][A-Za-z0-9_]*=(?:"[^"]*"|'[^']*'|\S*)\s+/, '');
    if (next === command) {
      break;
    }
    command = next;
  }
  return command;
};

const printsSecret = (code) =>
  splitCommands(code).some((fragment) => {
    const command = normalizeCommand(fragment);
    if (!/^(?:echo|printf)\b/.test(command)) {
      return false;
    }
    return expandedReferences(command).some(isSensitiveName);
  });

// Checks the raw code (which sees substitutions such as `$(env)`) and each command with its prefixes
// removed, so `DEBUG=1 env`, `command printenv` and `if printenv; then :; fi` are caught too.
const dumpsEnvironment = (code) =>
  ENV_DUMP_PATTERNS.some(
    (pattern) =>
      pattern.test(code) ||
      splitCommands(code).some((fragment) => pattern.test(normalizeCommand(fragment)))
  );

// A line ending in an odd number of backslashes continues onto the next line.
const endsWithContinuation = (code) => {
  const match = code.match(/(\\+)\s*$/);
  return Boolean(match) && match[1].length % 2 === 1;
};

// Joins backslash-continued lines into one logical line. `line` is where the command starts and
// `text` is the joined, trimmed source (used only to match exceptions).
const toLogicalLines = (entries) => {
  const result = [];
  let pending = null;
  const flush = () => {
    result.push({ line: pending.line, code: pending.code, text: pending.texts.join(' ').trim() });
    pending = null;
  };
  entries.forEach(({ line, raw }) => {
    const code = stripComment(raw);
    const continued = endsWithContinuation(code);
    pending = pending || { line, code: '', texts: [] };
    const codePart = (continued ? code.replace(/\\\s*$/, '') : code).trim();
    pending.code = pending.code ? `${pending.code} ${codePart}` : codePart;
    pending.texts.push(
      continued
        ? raw
            .trim()
            .replace(/\\\s*$/, '')
            .trim()
        : raw.trim()
    );
    if (!continued) {
      flush();
    }
  });
  if (pending) {
    flush();
  }
  return result;
};

const unquoteYaml = (value) => {
  if (value.length >= 2 && value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1).replace(/\\(["\\])/g, '$1');
  }
  if (value.length >= 2 && value.startsWith("'") && value.endsWith("'")) {
    return value.slice(1, -1).replace(/''/g, "'");
  }
  return value;
};

const YAML_COMMAND_KEY = /^(\s*(?:-\s+)*)(?:run|command)\s*:\s*(.*)$/;
const YAML_BLOCK_INDICATOR = /^[|>][-+0-9]*\s*(?:#.*)?$/;

// A folded block scalar (`>`) joins consecutive lines of equal indentation into one line with
// spaces, which is what the shell receives. A blank line or a more-indented line ends the fold.
// `entries` carry { line, raw, block, folded }; the result has folded runs joined into one entry
// that keeps the line number of its first line.
const foldYamlEntries = (entries) => {
  const result = [];
  let group = null;
  const flush = () => {
    if (group) {
      result.push({ line: group.line, raw: group.parts.join(' ') });
      group = null;
    }
  };
  entries.forEach((entry) => {
    if (!entry.folded) {
      flush();
      result.push({ line: entry.line, raw: entry.raw });
      return;
    }
    const text = entry.raw.trim();
    const indent = entry.raw.length - entry.raw.trimStart().length;
    if (!text) {
      flush();
    } else if (group && group.block === entry.block && group.indent === indent) {
      group.parts.push(text);
    } else {
      flush();
      group = { line: entry.line, block: entry.block, indent, parts: [text] };
    }
  });
  flush();
  return result;
};

// In CircleCI YAML, shell is only the value of a `run:` or `command:` key: either inline
// (`- run: env`, `command: "set -x"`) or a block scalar (`command: |` / `command: >` and the indented
// lines under it; a folded `>` block is joined the way YAML folds it before the shell sees it). Everything
// else (names, parameters, descriptions) is not executed and is not scanned. Flow-style mappings such as
// `run: { command: env }` are not handled.
const yamlCommandEntries = (lines) => {
  const entries = [];
  let blockColumn = null;
  let blockId = 0;
  let blockFolded = false;
  lines.forEach((raw, index) => {
    if (blockColumn !== null) {
      const indent = raw.match(/^\s*/)[0].length;
      if (!raw.trim() || indent > blockColumn) {
        entries.push({ line: index + 1, raw, block: blockId, folded: blockFolded });
        return;
      }
      blockColumn = null;
    }
    const match = raw.match(YAML_COMMAND_KEY);
    if (!match) {
      return;
    }
    const value = match[2].trim();
    if (YAML_BLOCK_INDICATOR.test(value)) {
      blockColumn = match[1].length;
      blockId += 1;
      blockFolded = value.startsWith('>');
    } else if (value) {
      entries.push({ line: index + 1, raw: unquoteYaml(stripComment(value).trim()) });
    }
  });
  return foldYamlEntries(entries);
};

// Scans one file's text. Returns [{ file, line, rule, text }]; `text` is the trimmed source
// line (continued lines joined by a space), used only to match exceptions. It must not be
// written into diagnostics.
const scanText = (file, text) => {
  const violations = [];
  const lines = text.split(/\r?\n/);
  const isYaml = /\.ya?ml$/.test(file);
  const entries = isYaml
    ? yamlCommandEntries(lines)
    : lines.map((raw, i) => ({ line: i + 1, raw }));

  if (!isYaml && TRACE_SHEBANG.test(lines[0] || '')) {
    violations.push({ file, line: 1, rule: 'shell-trace', text: lines[0].trim() });
  }

  toLogicalLines(entries).forEach(({ line, code, text: sourceText }) => {
    if (!code) {
      return;
    }
    const add = (rule) => violations.push({ file, line, rule, text: sourceText });

    if (dumpsEnvironment(code)) {
      add('env-dump');
    }
    if (hasUncapturedCfEnv(code)) {
      add('cf-env');
    }
    if (SET_TRACE.test(code) || SHELL_TRACE_INVOCATION.test(code)) {
      add('shell-trace');
    }
    if (printsSecret(code)) {
      add('print-secret');
    }
  });
  return violations;
};

const SHELL_SHEBANG = /^#!.*\b(?:ba|da|z|k)?sh\b/;

const isShellFile = (file, firstLine) =>
  /\.(?:sh|bash)$/.test(file) ||
  file.endsWith('.circleci/config.yml') ||
  SHELL_SHEBANG.test(firstLine);

// Raised for a failure to run the check, as opposed to a finding. Its message never includes git
// output or file contents.
class CheckError extends Error {}
class ExceptionsError extends CheckError {}

const listFiles = (root, target) => {
  const absolute = path.join(root, target);
  if (!fs.existsSync(absolute)) {
    return [];
  }
  const stat = fs.statSync(absolute);
  if (stat.isFile()) {
    return [target];
  }
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const relative = path.posix.join(target, entry.name);
    if (entry.isDirectory()) {
      return SKIPPED_DIRECTORIES.has(entry.name) ? [] : listFiles(root, relative);
    }
    return entry.isFile() ? [relative] : [];
  });
};

// A source supplies the files to scan and their contents: `listFiles(target)` returns repository
// paths under a target, and `read(file, { optional })` returns a Buffer (null for a missing or
// oversized file when optional).
const workingTreeSource = (root) => ({
  listFiles: (target) => listFiles(root, target),
  read: (file) => {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute) || fs.statSync(absolute).size > MAX_FILE_BYTES) {
      return null;
    }
    return fs.readFileSync(absolute);
  },
});

// Reads from the git index, i.e. what `git commit` would commit, ignoring unstaged edits. Used by
// the pre-commit hook so the check sees exactly the content (and the exceptions) being committed.
const indexSource = (root) => {
  const git = (args) => {
    try {
      return execFileSync('git', args, {
        cwd: root,
        maxBuffer: GIT_MAX_BUFFER,
        stdio: ['ignore', 'pipe', 'ignore'],
      });
    } catch {
      throw new CheckError(`git ${args[0]} failed while reading the staged files`);
    }
  };
  return {
    listFiles: (target) =>
      git(['ls-files', '-z', '--', target])
        .toString('utf8')
        .split('\0')
        .filter((file) => file && !file.split('/').some((part) => SKIPPED_DIRECTORIES.has(part))),
    read: (file, { optional = false } = {}) => {
      if (optional && !git(['ls-files', '-z', '--', file]).length) {
        return null;
      }
      const buffer = git(['show', `:${file}`]);
      return buffer.length > MAX_FILE_BYTES ? null : buffer;
    },
  };
};

const scanRepository = (root, targets = SCAN_TARGETS, source = workingTreeSource(root)) => {
  const violations = [];
  targets
    .flatMap((target) => source.listFiles(target))
    .forEach((file) => {
      const buffer = source.read(file);
      if (!buffer || buffer.includes(0)) {
        return;
      }
      const text = buffer.toString('utf8');
      if (isShellFile(file, text.split('\n', 1)[0])) {
        violations.push(...scanText(file, text));
      }
    });
  return violations;
};

const loadExceptions = (
  root,
  exceptionsPath = DEFAULT_EXCEPTIONS_PATH,
  source = workingTreeSource(root)
) => {
  const buffer = source.read(exceptionsPath, { optional: true });
  if (!buffer) {
    return [];
  }
  let parsed;
  try {
    parsed = JSON.parse(buffer.toString('utf8'));
  } catch {
    throw new ExceptionsError(`${exceptionsPath} is not valid JSON`);
  }
  if (!Array.isArray(parsed.exceptions)) {
    throw new ExceptionsError(`${exceptionsPath} must contain an "exceptions" array`);
  }
  parsed.exceptions.forEach((entry, index) => {
    const label = `${exceptionsPath} exception #${index + 1}`;
    ['file', 'rule', 'text', 'justification', 'ticket'].forEach((field) => {
      if (typeof entry[field] !== 'string' || !entry[field].trim()) {
        throw new ExceptionsError(`${label} is missing "${field}"`);
      }
    });
    if (!RULES[entry.rule]) {
      throw new ExceptionsError(`${label} has an unknown rule "${entry.rule}"`);
    }
    if (entry.justification.trim().length < MIN_JUSTIFICATION_LENGTH) {
      throw new ExceptionsError(`${label} needs a real justification`);
    }
  });
  return parsed.exceptions;
};

// An exception covers every line in `file` whose trimmed text equals `text` for `rule`.
// Anything else, including a line that was edited, is reported again.
const applyExceptions = (violations, exceptions) => {
  const used = new Set();
  const remaining = violations.filter((violation) => {
    const index = exceptions.findIndex(
      (entry) =>
        entry.file === violation.file &&
        entry.rule === violation.rule &&
        entry.text.trim() === violation.text
    );
    if (index === -1) {
      return true;
    }
    used.add(index);
    return false;
  });
  const unused = exceptions.filter((_, index) => !used.has(index));
  return { remaining, unused };
};

// With `staged: true` the check reads the git index (files and exceptions) instead of the working tree.
const checkRepository = ({
  root = process.cwd(),
  exceptionsPath = DEFAULT_EXCEPTIONS_PATH,
  targets = SCAN_TARGETS,
  staged = false,
} = {}) => {
  const source = staged ? indexSource(root) : workingTreeSource(root);
  const exceptions = loadExceptions(root, exceptionsPath, source);
  const { remaining, unused } = applyExceptions(scanRepository(root, targets, source), exceptions);
  return { violations: remaining, unusedExceptions: unused, exceptionsPath };
};

const formatReport = ({ violations, unusedExceptions, exceptionsPath }) => {
  const lines = [];
  if (violations.length) {
    lines.push(
      `Found ${violations.length} command(s) that may print the environment or secret values.`,
      'CircleCI job logs for this project are public, so anything printed there is published.',
      ''
    );
    violations.forEach((violation) => {
      const rule = RULES[violation.rule];
      lines.push(
        `  ${violation.file}:${violation.line} [${violation.rule}] ${rule.why}.`,
        `      Fix: ${rule.fix}.`
      );
    });
    lines.push(
      '',
      'If the command is safe (it cannot print a secret), request an exception: add an entry to',
      `${exceptionsPath} with the file, rule, the exact trimmed line text, a justification, and a`,
      'ticket, and have it reviewed in your PR. See docs/guides/circle-ci.md.'
    );
  }
  if (unusedExceptions.length) {
    lines.push(
      '',
      `${exceptionsPath} has ${unusedExceptions.length} exception(s) that no longer match any line.`,
      'Remove them so the list stays accurate:'
    );
    unusedExceptions.forEach((entry) => {
      lines.push(`  ${entry.file} [${entry.rule}]`);
    });
  }
  return lines.join('\n');
};

const main = (argv) => {
  const rootIndex = argv.indexOf('--root');
  const root = rootIndex === -1 ? process.cwd() : path.resolve(argv[rootIndex + 1]);
  let result;
  try {
    result = checkRepository({ root, staged: argv.includes('--staged') });
  } catch (error) {
    if (error instanceof CheckError) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }
  if (result.violations.length || result.unusedExceptions.length) {
    console.error(formatReport(result));
    return 1;
  }
  console.log('No commands that print the environment or secret values were found.');
  return 0;
};

if (require.main === module) {
  process.exitCode = main(process.argv.slice(2));
}

module.exports = {
  RULES,
  SCAN_TARGETS,
  CheckError,
  ExceptionsError,
  workingTreeSource,
  indexSource,
  scanText,
  scanRepository,
  loadExceptions,
  applyExceptions,
  checkRepository,
  formatReport,
  main,
};
