import stringify from 'csv-stringify/lib/sync';
import { Request, Response } from 'express';
import { currentUserId } from '../../services/currentUser';
import { userById } from '../../services/users';
import {
  isFile,
  checkFolderPermissions,
  FilterValues,
  listQueryFiles,
  readFiltersFromFile,
  preprocessAndValidateFilters,
  setFilters,
  sanitizeFilename,
  generateFilterString,
  executeQuery,
} from '../../services/ssdi';
import User from '../../policies/user';
import getCachedResponse from '../../lib/cache';

const validateScriptPath = async (
  scriptPath: string,
  user,
  res: Response,
  skipFileCheck = false,
) => {
  // Ensure the scriptPath is provided by the user
  if (!scriptPath) {
    res.status(400).send('Script path is required');
    return true;
  }

  // Protect against path traversal attacks
  if (scriptPath.includes('../') || scriptPath.includes('/..')) {
    res.status(400).json({ error: 'Invalid script path: Path traversal detected' });
    return true;
  }

  // Ensure the scriptPath starts with either "dataRequests" or "api"
  if (!(scriptPath.startsWith('dataRequests') || scriptPath.startsWith('api'))) {
    res.status(400).json({ error: 'Invalid script path: Must start with "dataRequests" or "api"' });
    return true;
  }

  // Check folder permissions based on the internal path and user
  const hasAccess = await checkFolderPermissions(user, scriptPath);
  if (!hasAccess) {
    res.status(403).json({ error: 'Access forbidden: You do not have permission to run this query' });
    return true;
  }

  if (!skipFileCheck) {
    const fileExists = await isFile(scriptPath);
    if (!fileExists) {
      res.status(400).json({ error: 'Invalid script path: No file matches the path specified' });
      return true;
    }
  }

  return res.headersSent; // Return whether headers have been sent to prevent further processing
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
  // Trim the scriptPath and default to 'dataRequests' if it's not set or an empty string
  const scriptPath = (req.query.path as string || '').trim() || 'dataRequests';

  const userId = await currentUserId(req, res);
  const user = await userById(userId);

  // Check if the response has been sent (status or headers set) and return early
  if (await validateScriptPath(scriptPath, user, res, true)) {
    return;
  }

  try {
    // Use the validated internal scriptPath for listing queries
    const queryFiles = await listQueryFiles(scriptPath, user);
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
  const user = await userById(userId);

  // Check if the response has been sent (status or headers set) and return early
  if (await validateScriptPath(scriptPath, user, res)) {
    return;
  }

  try {
    // Extract the `options` query parameter and default it to `false` if not provided
    const includeOptions = req.query.options === 'true';

    // Pass the `includeOptions` argument to the `readFiltersFromFile` function
    const filters = await readFiltersFromFile(`./${scriptPath}`, userId, includeOptions);

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
  const user = await userById(userId);

  // Check if the response has been sent (status or headers set) and return early
  if (await validateScriptPath(scriptPath, user, res)) {
    return;
  }

  try {
    const useCache = !(req.body.cache === 'false' || req.query.cache === 'false');
    const filters = await readFiltersFromFile(scriptPath, userId, true);
    const filterValues: FilterValues = filterAttributes(
      {
        ...req.body,
        ...req.query,
      },
      ['path', 'format', 'cache'],
    );

    const policy = new User(user);

    // Handle regionIds with policy filtering
    if (filterValues['region.in'] && Array.isArray(filterValues['region.in'])) {
      filterValues['region.in'] = filterValues['region.in']
        .map(Number)
        .filter((num) => !Number.isNaN(num));
      filterValues['region.in'] = policy.filterRegions(filterValues['region.in']);
    } else {
      filterValues['region.in'] = policy.getAllAccessibleRegions();
    }

    if (!filterValues['region.in'] || filterValues['region.in'].length === 0) {
      res.status(401).json({ error: 'Access forbidden: User has no region access configured.' });
      return;
    }

    const {
      result: validatedFilters,
      errors,
    } = preprocessAndValidateFilters(
      filters,
      filterValues,
    );

    if (errors?.invalidFilters?.length || errors?.invalidTypes?.length) {
      res.status(400).json({ errors });
      return;
    }

    const run = async () => {
      await setFilters(validatedFilters);
      const queryResult = await executeQuery(scriptPath);
      return JSON.stringify(queryResult);
    };

    const queryResultString = useCache
      ? await getCachedResponse(
        `${scriptPath} ${JSON.stringify(validatedFilters)}`,
        run,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ) as any
      : await run();
    const queryResult = JSON.parse(queryResultString);

    const sanitizedOutputName = sanitizeFilename(`${filters.outputName}`);

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
