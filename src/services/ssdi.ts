import fs from 'fs';
import path from 'path';
import { QueryTypes } from 'sequelize';
import db from '../models';

interface Flag {
  type: string;
  name: string;
  description: string;
}

interface Flags {
  [key: string]: Flag;
}

interface FlagValues {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface QueryFile {
  name: string;
  description: string;
  filePath: string;
  defaultOutputName: string;
}

interface CachedQuery {
  flags: Flags;
  query: string;
  defaultOutputName: string;
}

// Caches to store the parsed query files and their metadata
const queryFileCache: Map<string, QueryFile> = new Map();
const queryDataCache: Map<string, CachedQuery> = new Map();

// Helper function to read name, description, and default output name from a file
const readNameAndDescriptionFromFile = (
  filePath: string,
): {
  name: string;
  description: string;
  defaultOutputName: string;
} => {
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const nameMatch = fileContents.match(/@name:\s*(.*)/);
  const descriptionMatch = fileContents.match(/@description:\s*(.*)/);
  const defaultOutputNameMatch = fileContents.match(/@defaultOutputName:\s*(.*)/);
  const fileName = path.basename(filePath, path.extname(filePath));
  return {
    name: nameMatch ? nameMatch[1].trim() : fileName,
    description: descriptionMatch ? descriptionMatch[1].trim() : 'No description available',
    defaultOutputName: defaultOutputNameMatch ? defaultOutputNameMatch[1].trim() : fileName,
  };
};

// Helper function to list all query files with name and description
const listQueryFiles = (directory: string): QueryFile[] => {
  const files = fs.readdirSync(directory);
  return files.map((file) => {
    const filePath = path.join(directory, file);
    if (queryFileCache.has(filePath)) {
      return queryFileCache.get(filePath) as QueryFile;
    }
    const { name, description, defaultOutputName } = readNameAndDescriptionFromFile(filePath);
    const queryFile: QueryFile = {
      name,
      description,
      filePath,
      defaultOutputName,
    };
    queryFileCache.set(filePath, queryFile);
    return queryFile;
  });
};

// Helper function to read flags and the query from the file
const readFlagsAndQueryFromFile = (
  filePath: string,
): CachedQuery => {
  // Check if the query data is already cached
  if (queryDataCache.has(filePath)) {
    return queryDataCache.get(filePath) as CachedQuery;
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');
  const lines = fileContents.split('\n');
  const flags: Flags = {};
  const queryLines: string[] = [];
  let inCommentBlock = false;
  let defaultOutputName = 'output';

  lines.forEach((line) => {
    if (line.trim().startsWith('/*')) {
      inCommentBlock = true;
    } else if (line.trim().endsWith('*/')) {
      inCommentBlock = false;
      return;
    }

    if (inCommentBlock) {
      const flagMatch = line.match(/ - ssdi\.(\w+) - (\w+\[\]) - (.*)/);
      const defaultOutputNameMatch = line.match(/@defaultOutputName:\s*(.*)/);
      if (flagMatch) {
        flags[flagMatch[1]] = { type: flagMatch[2], name: flagMatch[1], description: flagMatch[3] };
      }
      if (defaultOutputNameMatch) {
        defaultOutputName = defaultOutputNameMatch[1].trim();
      }
    } else {
      queryLines.push(line.trim()); // Trim spaces from each query line
    }
  });

  // Join the query lines and remove leading and trailing blank lines
  const query = queryLines
    .map((line) => line.replace(/--.*$/, '').trim())
    .join('\n')
    .replace(/^\s*\n|\s*\n$/g, '');

  const cachedQuery: CachedQuery = { flags, query, defaultOutputName };
  // Cache the parsed query data
  queryDataCache.set(filePath, cachedQuery);

  return cachedQuery;
};

// Function to validate the type of the flag values
const validateType = (
  expectedType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  value: any,
): boolean => {
  switch (expectedType) {
    case 'integer[]':
      return Array.isArray(value) && value.every((v) => Number.isInteger(v));
    case 'date[]':
      return Array.isArray(value) && value.every((v) => !Number.isNaN(Date.parse(v)));
    case 'string[]':
      return Array.isArray(value) && value.every((v) => typeof v === 'string');
    case 'boolean[]':
      return Array.isArray(value) && value.every((v) => typeof v === 'boolean');
    default:
      throw new Error(`Unknown type: ${expectedType}`);
  }
};

// Helper function to validate flag values
const validateFlagValues = (flags: Flags, flagValues: FlagValues): void => {
  Object.entries(flagValues).forEach(([key, value]) => {
    if (!flags[key]) {
      throw new Error(`Invalid flag: ${key}`);
    }
    const expectedType = flags[key].type;
    if (!validateType(expectedType, value)) {
      throw new Error(`Invalid type for flag ${key}: expected ${expectedType}`);
    }
  });
};

// Helper function to set flags in the database
const setFlags = async (
  flags: Flags,
  flagValues: FlagValues,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> => Promise.all(Object.entries(flagValues).map(async (
  [key, value],
) => db.sequelize.query(
  'SELECT set_config($1, $2, false)',
  {
    bind: [`ssdi.${key}`, JSON.stringify(value)],
    type: db.sequelize.QueryTypes.SELECT,
  },
)));

// Helper function to sanitize filenames
const sanitizeFilename = (filename: string): string => filename.replace(/[^a-zA-Z0-9-_]/g, '_');

// Helper function to generate a string representation of the flag values
const generateFlagString = (flagValues: FlagValues): string => Object.entries(flagValues)
  .map(([key, value]) => `${key}_${Array.isArray(value) ? value.join('-') : value}`)
  .join('_');

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const executeQuery = async (query: string): Promise<any> => {
  if (typeof query !== 'string') {
    throw new Error('The query must be a string');
  }

  try {
    // Set transaction to READ ONLY, this will fail the transaction if any tables are modified
    await db.sequelize.query('SET TRANSACTION READ ONLY;', { type: QueryTypes.RAW });

    const result = await db.sequelize.query(query, { type: QueryTypes.SELECT });
    return result;
  } catch (error) {
    throw new Error(`Query failed: ${error.message}`);
  }
};

export {
  Flag,
  Flags,
  FlagValues,
  QueryFile,
  listQueryFiles,
  readNameAndDescriptionFromFile,
  readFlagsAndQueryFromFile,
  validateFlagValues,
  validateType,
  setFlags,
  sanitizeFilename,
  generateFlagString,
  executeQuery,
};
