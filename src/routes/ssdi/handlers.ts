import stringify from 'csv-stringify/lib/sync';
import { Request, Response } from 'express';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import {
  FilterValues,
  listQueryFiles,
  readFiltersFromFile,
  preprocessAndValidateFilters,
  setFilters,
  sanitizeFilename,
  generateFilterString,
  executeQuery,
} from '../../services/ssdi';
import Generic from '../../policies/generic';

// Check if the user has access to a specific folder
const checkFolderPermissions = async (user, scriptPath: string) => {
  const policy = new Generic(user);

  // Map specific paths to permissions
  if (scriptPath.includes('dataRequests/ohs') || scriptPath.includes('dataRequests/internal')) {
    // TODO: make migration to add ssdi_restricted to feature flags
    return policy.hasFeatureFlag('ssdi_restricted');
  }
  // Default: Allow access to public folders (api and dataRequests/user)
  return true;
};

const validateScriptPath = async (
  scriptPath: string,
  userId: number,
  res: Response,
) => {
  const user = await userById(userId);

  if (!scriptPath) {
    res.status(400).send('Script path is required');
  } else if (scriptPath.includes('../')) {
    res.status(400).json({ error: 'Invalid script path: Path traversal detected' });
  } else if (!scriptPath.startsWith('src/queries/')) {
    res.status(400).json({ error: 'Invalid script path: all scripts are located within "src/queries/"' });
  } else if (!await checkFolderPermissions(user, scriptPath)) {
    res.status(403).json({ error: 'Access forbidden: You do not have permission to run this query' });
  }

  return res.headersSent;
};

// Filters out certain attributes from an object
const filterAttributes = <T extends object>(
  obj: T,
  keysToRemove: (keyof T)[],
): Partial<T> => Object.fromEntries(
    Object.entries(obj).filter(([key]) => !keysToRemove.includes(key as keyof T)),
  ) as Partial<T>;

// List all available query files with name and description
const listQueries = async (req: Request, res: Response) => {
  const scriptPath = req.query.path as string;
  const userId = await currentUserId(req, res);

  // Check if the response has been sent (status or headers set) and return early
  if (await validateScriptPath(scriptPath, userId, res)) {
    return;
  }

  try {
    const queryFiles = await listQueryFiles('./src/queries/');
    res.json(queryFiles);
  } catch (error) {
    res.status(500).send('Error listing query files');
  }
};

// Thin wrapper for listQueries that converts req.params[0] to req.query.path
const listQueriesWithWildcard = (req: Request, res: Response) => {
  // Convert req.params[0] (from wildcard path) to req.query.path
  // eslint-disable-next-line prefer-destructuring
  req.query.path = req.params[0];

  // Call the original listQueries implementation
  return listQueries(req, res);
};

// Reads the filters and query from the file and sends the filters to the UI
const getFilters = async (req: Request, res: Response) => {
  const scriptPath = req.query.path as string;
  const userId = await currentUserId(req, res);

  // Check if the response has been sent (status or headers set) and return early
  if (await validateScriptPath(scriptPath, userId, res)) {
    return;
  }

  try {
    const filters = await readFiltersFromFile(`./${scriptPath}`, userId);
    res.json(filters);
  } catch (error) {
    res.status(500).send('Error reading filters');
  }
};

// Thin wrapper for getFilters that converts req.params[0] to req.query.path
const getFiltersWithWildcard = (req: Request, res: Response) => {
  // Convert req.params[0] (from wildcard path) to req.query.path
  // eslint-disable-next-line prefer-destructuring
  req.query.path = req.params[0];

  // Call the original getFilters implementation
  return getFilters(req, res);
};

// Runs the query after setting the filters
const runQuery = async (req: Request, res: Response) => {
  const scriptPath = req.query.path as string;
  const outputFormat = (req.query.format as string) || 'json';
  const userId = await currentUserId(req, res);

  // Check if the response has been sent (status or headers set) and return early
  if (await validateScriptPath(scriptPath, userId, res)) {
    return;
  }

  try {
    const filters = await readFiltersFromFile(scriptPath, userId, true);
    const filterValues: FilterValues = filterAttributes(
      {
        ...req.body,
        ...req.query,
      },
      ['path', 'format'],
    );

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

// Thin wrapper for runQuery that converts req.params[0] to req.query.path
const runQueryWithWildcard = (req: Request, res: Response) => {
  // Convert req.params[0] (from wildcard path) to req.query.path
  // eslint-disable-next-line prefer-destructuring
  req.query.path = req.params[0];

  // Call the original runQuery implementation
  return runQuery(req, res);
};

export {
  checkFolderPermissions,
  validateScriptPath,
  filterAttributes,
  listQueries,
  listQueriesWithWildcard,
  getFilters,
  getFiltersWithWildcard,
  runQuery,
  runQueryWithWildcard,
};
