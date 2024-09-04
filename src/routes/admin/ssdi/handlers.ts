import stringify from 'csv-stringify/lib/sync';
import { Request, Response } from 'express';
import { currentUserId } from '../../../services/currentUser';
import { userById } from '../../../services/users';
import {
  FlagValues,
  listQueryFiles,
  readFiltersFromFile,
  readFlagsAndQueryFromFile,
  validateFlagValues,
  setFlags,
  sanitizeFilename,
  generateFlagString,
  executeQuery,
} from '../../../services/ssdi';
import Generic from '../../../policies/generic';

// list all available query files with name and description
const listQueries = async (req: Request, res: Response) => {
  try {
    const queryFiles = listQueryFiles('./src/queries/');
    res.json(queryFiles);
  } catch (error) {
    res.status(500).send('Error listing query files');
  }
};

// Reads the filters and query from the file and sends the flags to the UI
const getFilters = async (req: Request, res: Response) => {
  const scriptPath = req.query.path as string;
  if (!scriptPath) {
    res.status(400).send('Script path is required');
    return;
  }
  if (scriptPath.includes('../')) {
    res.status(400).json({ error: 'Invalid script path: Path traversal detected' });
    return;
  }
  if (!scriptPath.startsWith('src/queries/')) {
    res.status(400).json({ error: 'Invalid script path: all scripts are located within "src/queries/"' });
    return;
  }

  try {
    const { filters } = await readFiltersFromFile(`./${scriptPath}`);
    res.json(filters);
  } catch (error) {
    res.status(500).send('Error reading filters');
  }
};

const filterAttributes = <T extends object>(
  obj: T,
  keysToRemove: (keyof T)[],
): Partial<T> => Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keysToRemove.includes(key as keyof T)),
  ) as Partial<T>;

const suffixMapping = {
  '.bef': '.not',
  '.nin': '.not',
  '.nctn': '.not',
};

const stripSuffixes = ['.aft', '.win', '.in', '.ctn'];

const preprocessFilters = (input: Record<string, any>) => {
  const result: Record<string, any> = {};

  Object.keys(input).forEach((key) => {
    // Check for suffix replacements
    const suffix = Object.keys(suffixMapping).find((s) => key.endsWith(s));
    let newKey = key;
    let newValue = input[key];

    if (suffix) {
      newKey = key.replace(suffix, suffixMapping[suffix]);
    } else {
      // Check for stripping suffixes
      const stripSuffix = stripSuffixes.find((s) => key.endsWith(s));
      if (stripSuffix) {
        newKey = key.replace(stripSuffix, '');

        // Special case for .win and .in to split the value by '-' if not an array
        if ((stripSuffix === '.win' || stripSuffix === '.in') && !Array.isArray(newValue)) {
          newValue = newValue.split('-');
        }
      }
    }

    // Convert the value to an array if it isn't already
    if (!Array.isArray(newValue)) {
      newValue = [newValue];
    }

    result[newKey] = newValue;
  });

  return result;
};

// Reads the flags and runs the query after setting the flags
const runQuery = async (req: Request, res: Response) => {
  const scriptPath = req.query.path as string;
  const outputFormat = (req.query.format as string) || 'json';
  if (!scriptPath) {
    res.status(400).send('Script path is required');
    return;
  }
  if (scriptPath.includes('../')) {
    res.status(400).json({ error: 'Invalid script path: Path traversal detected' });
    return;
  }
  if (!scriptPath.startsWith('src/queries/')) {
    res.status(400).json({ error: 'Invalid script path: all scripts are located within "src/queries/"' });
    return;
  }

  try {
    const { flags, query, defaultOutputName } = readFlagsAndQueryFromFile(scriptPath);
    let filterValues: FlagValues = filterAttributes(
      {
        ...req.body,
        ...req.query,
      },
      ['path', 'format'],
    );
    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const policy = new Generic(user);

    // Check if flagValues contains regionIds, filter the values with policy.filterRegions
    // passing in the regionIds. If flagValues does not contain regionIds, use
    // policy.getAllAccessibleRegions to define it. Before calling validateFlagValues,
    // regionIds must be defined and not be an empty set

    if (filterValues.regionIds) {
      filterValues.regionIds = filterValues.regionIds
        .map(Number)
        .filter((num) => !Number.isNaN(num));
      filterValues.regionIds = policy.filterRegions(filterValues.regionIds);
    } else {
      filterValues.regionIds = policy.getAllAccessibleRegions();
    }

    if (!filterValues.regionIds || filterValues.regionIds.length === 0) {
      res.sendStatus(401);
      return;
    }
    filterValues = preprocessFilters(filterValues);
    validateFlagValues(flags, filterValues);
    await setFlags(flags, filterValues);
    const result = await executeQuery(query);

    const sanitizedOutputName = sanitizeFilename(`${defaultOutputName}_${generateFlagString(filterValues)}`);

    if (outputFormat === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedOutputName}.csv"`);
      const csvData = stringify(result, { header: true });
      res.attachment(`${sanitizedOutputName}.csv`);
      res.send(`\ufeff${csvData}`);
    } else {
      res.json(result);
    }
  } catch (error) {
    res.status(500).send(`Error executing query: ${error.message}`);
  }
};

export {
  listQueries,
  getFlags,
  runQuery,
};
