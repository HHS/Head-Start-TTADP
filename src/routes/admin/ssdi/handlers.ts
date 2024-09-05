import stringify from 'csv-stringify/lib/sync';
import { Request, Response } from 'express';
import { currentUserId } from '../../../services/currentUser';
import { userById } from '../../../services/users';
import {
  FilterValues,
  listQueryFiles,
  readFiltersFromFile,
  preprocessAndValidateFilters,
  setFilters,
  sanitizeFilename,
  generateFilterString,
  executeQuery,
} from '../../../services/ssdi';
import Generic from '../../../policies/generic';

// List all available query files with name and description
const listQueries = async (req: Request, res: Response) => {
  try {
    const queryFiles = await listQueryFiles('./src/queries/');
    res.json(queryFiles);
  } catch (error) {
    res.status(500).send('Error listing query files');
  }
};

// Reads the filters and query from the file and sends the filters to the UI
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
    const filters = await readFiltersFromFile(`./${scriptPath}`);
    res.json(filters);
  } catch (error) {
    res.status(500).send('Error reading filters');
  }
};

// Filters out certain attributes from an object
const filterAttributes = <T extends object>(
  obj: T,
  keysToRemove: (keyof T)[],
): Partial<T> => Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keysToRemove.includes(key as keyof T)),
  ) as Partial<T>;

// Runs the query after setting the filters
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
    const filters = await readFiltersFromFile(scriptPath, true);
    const filterValues: FilterValues = filterAttributes(
      {
        ...req.body,
        ...req.query,
      },
      ['path', 'format'],
    );

    const userId = await currentUserId(req, res);
    const user = await userById(userId);
    const policy = new Generic(user);

    // Handle regionIds with policy filtering
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

    const { result, errors } = preprocessAndValidateFilters(filters, filterValues);
    if (errors.invalidFilters.length || errors.invalidTypes.length) {
      res.status(400).json({ errors });
      return;
    }

    await setFilters(result);
    const queryResult = await executeQuery(scriptPath);

    const sanitizedOutputName = sanitizeFilename(`${filters.outputName}_${generateFilterString(result)}`);

    if (outputFormat === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${sanitizedOutputName}.csv"`);
      const csvData = stringify(queryResult, { header: true });
      res.attachment(`${sanitizedOutputName}.csv`);
      res.send(`\ufeff${csvData}`);
    } else {
      res.json(queryResult);
    }
  } catch (error) {
    res.status(500).send(`Error executing query: ${error.message}`);
  }
};

export {
  listQueries,
  getFilters,
  runQuery,
};
