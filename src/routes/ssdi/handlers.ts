import stringify from 'csv-stringify/lib/sync';
import { Request, Response } from 'express';
import db from '../../models'; // Adjust the path according to your project structure
import {
  FlagValues,
  listQueryFiles,
  readFlagsAndQueryFromFile,
  validateFlagValues,
  setFlags,
  sanitizeFilename,
  generateFlagString,
  executeQuery,
} from '../../services/ssdi';
import Generic from '../../policies/generic';

// list all available query files with name and description
const listQueries = async (req: Request, res: Response) => {
  try {
    const queryFiles = listQueryFiles('./queries');
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

  try {
    const { flags } = readFlagsAndQueryFromFile(scriptPath);
    res.json(flags);
  } catch (error) {
    res.status(500).send('Error reading flags');
  }
};

// Reads the flags and runs the query after setting the flags
const runQuery = async (req: Request, res: Response) => {
  const scriptPath = req.query.path as string;
  const outputFormat = (req.query.format as string) || 'json';
  if (!scriptPath) {
    res.status(400).send('Script path is required');
    return;
  }

  try {
    const { flags, query, defaultOutputName } = readFlagsAndQueryFromFile(scriptPath);
    const flagValues: FlagValues = req.body;

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const policy = new Generic(user);

    // Check if flagValues contains recipientIds, filter the values with policy.filterRegions passing in the recipientIds.
    // If flagValues does not contain recipientIds, use policy.getAllAccessibleRegions to define it.
    // Before calling validateFlagValues, recipientIds must be defined and not be an empty set

    if (flagValues.recipientIds) {
      flagValues.recipientIds = policy.filterRegions(flagValues.recipientIds);
    } else {
      flagValues.recipientIds = policy.getAllAccessibleRegions();
    }

    if (!flagValues.recipientIds || flagValues.recipientIds.length === 0) {
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
      stringify(result[0], { header: true }).pipe(res);
    } else {
      res.json(result[0]);
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
