import { stringify } from 'csv-stringify/sync';
import express, { Request, Response } from 'express';
import db from '../../models'; // Adjust the path according to your project structure
import {
  FlagValues,
  listQueryFiles,
  readFlagsAndQueryFromFile,
  validateFlagValues,
  setFlags,
  sanitizeFilename,
  generateFlagString,
} from '../../services/ssdi';

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
// TODO: no current restrictions on what an authenticated user can pull.
//    Example: A user with only region 1 access can pull data for region 5
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
    validateFlagValues(flags, flagValues);
    await setFlags(flags, flagValues);
    const result = await db.sequelize.query(query);

    const sanitizedOutputName = sanitizeFilename(`${defaultOutputName}_${generateFlagString(flagValues)}`);

    if (outputFormat === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedOutputName}.csv"`);
      stringify(result[0], { header: true }).pipe(res);
    } else {
      res.json(result[0]);
    }
  } catch (error) {
    console.log(error);
    res.status(500).send(`Error executing query: ${error.message}`);
  }
};

export {
  listQueries,
  getFlags,
  runQuery,
};
