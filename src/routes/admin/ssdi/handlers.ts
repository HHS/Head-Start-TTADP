import stringify from 'csv-stringify/lib/sync';
import { Request, Response } from 'express';
import { currentUserId } from '../../../services/currentUser';
import { userById } from '../../../services/users';
import {
  FlagValues,
  listQueryFiles,
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

// Reads the flags and query from the file and sends the flags to the UI
const getFlags = async (req: Request, res: Response) => {
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
    const { flags } = readFlagsAndQueryFromFile(`./${scriptPath}`);
    res.json(flags);
  } catch (error) {
    res.status(500).send('Error reading flags');
  }
};

const filterAttributes = <T extends object>(
  obj: T,
  keysToRemove: (keyof T)[],
): Partial<T> => Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keysToRemove.includes(key as keyof T)),
  ) as Partial<T>;

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
    const flagValues: FlagValues = filterAttributes(
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

    if (flagValues.regionIds) {
      flagValues.regionIds = flagValues.regionIds.map(Number).filter((num) => !Number.isNaN(num));
      flagValues.regionIds = policy.filterRegions(flagValues.regionIds);
    } else {
      flagValues.regionIds = policy.getAllAccessibleRegions();
    }

    if (!flagValues.regionIds || flagValues.regionIds.length === 0) {
      res.sendStatus(401);
      return;
    }

    validateFlagValues(flags, flagValues);
    await setFlags(flags, flagValues);
    const result = await executeQuery(query);

    const sanitizedOutputName = sanitizeFilename(`${defaultOutputName}_${generateFlagString(flagValues)}`);

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
