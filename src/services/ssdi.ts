import fs from 'fs';
import path from 'path';
import db from '../models';

interface Flag {
  type: string;
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
  return {
    name: nameMatch ? nameMatch[1].trim() : 'Unknown', // TODO: use script file name as default
    description: descriptionMatch ? descriptionMatch[1].trim() : 'No description available',
    defaultOutputName: defaultOutputNameMatch ? defaultOutputNameMatch[1].trim() : 'output', // TODO: use script file name as default
  };
};

// Helper function to list all query files with name and description
const listQueryFiles = (directory: string): QueryFile[] => {
  const files = fs.readdirSync(directory);
  return files.map((file) => {
    const filePath = path.join(directory, file);
    const { name, description, defaultOutputName } = readNameAndDescriptionFromFile(filePath);
    return {
      name,
      description,
      filePath,
      defaultOutputName,
    };
  });
};

// Helper function to read flags and the query from the file
const readFlagsAndQueryFromFile = (
  filePath: string,
): {
  flags: Flags;
  query: string;
  defaultOutputName: string;
} => {
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
      const flagMatch = line.match(/ssdi\.(\w+) - (\w+\[\]) - (.*)/);
      const defaultOutputNameMatch = line.match(/@defaultOutputName:\s*(.*)/);
      if (flagMatch) {
        flags[flagMatch[1]] = { type: flagMatch[2], description: flagMatch[3] };
      }
      if (defaultOutputNameMatch) {
        defaultOutputName = defaultOutputNameMatch[1].trim();
      }
    } else {
      queryLines.push(line);
    }
  });

  // Join the query lines and remove leading and trailing blank lines
  const query = queryLines
    .join('\n')
    .replace(/^\s*\n|\s*\n$/g, '')
    .replace(/^\s*/, '');

  return { flags, query, defaultOutputName };
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
    case 'boolean':
      return typeof value === 'boolean';
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
};
