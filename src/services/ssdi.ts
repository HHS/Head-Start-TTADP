import { promises as fsPromises } from 'fs';
import path from 'path';
import { QueryTypes } from 'sequelize';
import db from '../models';
import User from '../policies/user';
import { auditLogger } from '../logger';

// Constants for readability
const MAX_POSTGRES_RECORD_LIMIT = 2147483647; // Maximum PostgreSQL supports

// Enum for filter types
enum FilterType {
  IntegerArray = 'integer[]',
  DateArray = 'date[]',
  StringArray = 'string[]',
  BooleanArray = 'boolean[]',
}

const suffixMapping = {
  '.bef': '.not',
  '.nin': '.not',
  '.nctn': '.not',
  // Stripping suffixes mapped to empty string
  '.aft': '',
  '.win': '',
  '.in': '',
  '.ctn': '',
};

// Types
interface HeaderFilter {
  name: string;
  type: string;
  display: string;
  description: string;
  supportsExclusion?: boolean;
  supportsFuzzyMatch?: boolean;
  options?: {
    query?: {
      sqlQuery: string;
      column: string;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    staticValues?: string[] | number[] | boolean[] | Record<string, any>[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    defaultValues?: string[] | number[] | boolean[] | Record<string, any>[];
  };
}

interface HeaderStructure {
  name: string;
  description: {
    standard: string;
    technical: string;
  };
  output: {
    defaultName: string;
    // Always present to define common columns like data_set and records
    schema: Array<{
      columnName: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: string | number | boolean | Record<string, any>;
      nullable: boolean;
      description: string;
    }>;
    sorting?: {
      default: Array<{
        name: string;
        order: 'ASC' | 'DESC';
      }>;
      supportsCustomSorting?: boolean;
    };
    supportsPagination?: boolean;
    multipleDataSets?: Array<{
      name: string;
      defaultName: string; // Default name for each dataset
      description: string;
      schema: Array<{
        columnName: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        type: string | number | boolean | Record<string, any>;
        nullable: boolean;
        description: string;
      }>;
      sorting?: {
        default: Array<{
          name: string;
          order: 'ASC' | 'DESC';
        }>;
        supportsCustomSorting?: boolean;
      };
      supportsPagination?: boolean;
    }>;
  };
  filters: Array<HeaderFilter>;
}

interface CachedFile {
  jsonHeader: HeaderStructure;
  query: string;
  modificationTime: Date;
}

interface QueryFile {
  name: string;
  description: string;
  technicalDescription: string;
  filePath: string;
  defaultOutputName: string;
}

interface Filter {
  id: string;
  display?: string;
  type: string;
  description: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: string[] | number[] | boolean[] | Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValues?: string[] | number[] | boolean[] | Record<string, any>[];
  conditions?: string[];
}

interface Filters {
  [key: string]: Filter;
}

interface FilterValues {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: string[] | number[] | boolean[] | Record<string, any>[];
}

interface CachedFilters {
  filters: Filters;
  supportsSorting: boolean;
  supportsPagination: boolean;
}

// Base directory for file operations
const isWindows = process.platform === 'win32';
const BASE_DIRECTORY = path.resolve(process.cwd(), isWindows ? 'src/queries/' : '/app/src/queries/');

// Cache to store parsed JSON headers and queries
const cache: Map<string, CachedFile> = new Map();

// Sanitize the filename
const sanitizeFilename = (filename: string): string => path.normalize(filename).replace(/[^a-zA-Z0-9-_]/g, '_');

// Check if the user has access to a specific folders
const checkFolderPermissions = async (
  user,
  scriptPath: string,
) => (new User(user)).checkPermissions(
  scriptPath,
  ['dataRequests/ohs', 'dataRequests/internal'],
  'ssdi_restricted',
);

// Safe file path resolution to prevent directory traversal attacks
const safeResolvePath = (inputPath: string): string => {
  const resolvedPath = path.resolve(BASE_DIRECTORY, inputPath);

  if (!resolvedPath.startsWith(BASE_DIRECTORY)) {
    throw new Error('Attempted to access a file outside the allowed directory.');
  }

  return resolvedPath;
};

/**
 * Function to check if a given path points to a file
 * @param filePath - The path to check
 * @returns {Promise<boolean>} - Returns true if the path is a file, otherwise false
 */
const isFile = async (filePath: string): Promise<boolean> => {
  try {
    // Use safeResolvePath to ensure secure path resolution
    const resolvedPath = safeResolvePath(filePath);
    const stats = await fsPromises.stat(resolvedPath);

    // Check if the path points to a file
    return stats.isFile();
  } catch {
    // Return false if the file doesn't exist or an error occurs
    return false;
  }
};

// Basic JSON validation function
// TODO: use zod for full validation
const isValidJsonHeader = (json: unknown): boolean => (
  json
  && typeof (json as HeaderStructure).name === 'string'
  && Array.isArray((json as HeaderStructure).filters)
);

// Modify the readJsonHeaderFromFile function to update the cache structure
const readJsonHeaderFromFile = async (filePath: string): Promise<CachedFile | null> => {
  const resolvedFilePath = safeResolvePath(filePath);

  // Get the file stats for modification time
  const fileStats = await fsPromises.stat(resolvedFilePath);
  const fileModifiedTime = fileStats.mtime;

  // Check cache: reload if modification time is newer than what's cached
  const cachedFile = cache.get(resolvedFilePath);
  if (cachedFile && cachedFile.modificationTime >= fileModifiedTime) {
    return cachedFile;
  }

  try {
    const fileContents = await fsPromises.readFile(resolvedFilePath, 'utf8');
    // eslint-disable-next-line no-useless-escape
    const jsonMatch = fileContents.match(/[\/][*](?:.|\r?\n)+JSON:\s*([{][\s\S]*[}])(?:.|\r?\n)+[*][\/]/);
    const queryMatch = fileContents.match(/\*\/([\s\S]*)/);

    if (jsonMatch && queryMatch) {
      const jsonHeader = JSON.parse(jsonMatch[1].trim());

      // Simple validation of the JSON header
      if (!isValidJsonHeader(jsonHeader)) {
        auditLogger.error('Invalid JSON structure');
        return null;
      }

      const query = queryMatch[1].trim();
      const newCachedFile: CachedFile = {
        jsonHeader,
        query,
        modificationTime: fileModifiedTime, // Add the modification time to the cache
      };

      // Update the cache with the new file data and modification time
      cache.set(resolvedFilePath, newCachedFile);
      return newCachedFile;
    }

    auditLogger.warn(`No valid JSON header or SQL query found in file ${filePath}.`);
    return null;
  } catch (error) {
    auditLogger.error(`Error reading or parsing file ${filePath}: ${error.message}`);
    return null;
  }
};

// Helper function to create a QueryFile from CachedFile
const createQueryFile = (filePath: string, cachedFile: CachedFile): QueryFile => ({
  name: cachedFile.jsonHeader.name,
  description: cachedFile.jsonHeader.description.standard, // or technical
  technicalDescription: cachedFile.jsonHeader.description.technical,
  filePath,
  defaultOutputName: cachedFile.jsonHeader.output.defaultName,
});

// Helper function to recursively read all files from a directory
const readFilesRecursively = async (directory: string): Promise<string[]> => {
  const list = await fsPromises.readdir(directory, { withFileTypes: true });

  // Use map to recursively process directories and files
  const files = list
    ? await Promise.all(
      list.map((dirent) => {
        if (!dirent || !dirent.name) {
          return null;
        }
        const fullPath = path.join(directory, dirent.name);

        if (dirent.isDirectory()) {
          // Recursively read files from subdirectories, return promise directly
          return readFilesRecursively(fullPath);
        }

        if (!dirent.name.endsWith('.sql')) {
          return null;
        }

        return fullPath;
      }),
    )
    : [];

  // Flatten the array of results (since subdirectories return arrays)
  return files
    .filter((fullPath) => fullPath)
    .flat();
};

// Function to check if the directory exists and is readable using fsPromises
const checkDirectoryExists = async (directory: string): Promise<boolean> => {
  try {
    // Check if the path exists and is a directory
    const stats = await fsPromises.stat(directory);
    if (!stats.isDirectory()) {
      return false;
    }

    // Check if the directory has read access
    await fsPromises.access(directory, fsPromises.constants.R_OK);

    return true;
  } catch (error) {
    return false;
  }
};

// Function to list all query files in a directory
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listQueryFiles = async (directory: string, user: any): Promise<QueryFile[]> => {
  try {
    const safeDirectory = safeResolvePath(directory);
    await checkDirectoryExists(process.cwd());
    if (!await checkDirectoryExists(safeDirectory)) {
      throw new Error(`Directory ${safeDirectory} does not exist.`);
    }
    const files = await readFilesRecursively(safeDirectory); // Use recursive lookup

    const queryFiles = await Promise.all(
      files.map(async (file) => {
        // Check if the user has access to the file
        const relativePath = path.relative('src/queries', file); // Use relative path for permission checks
        const hasAccess = await checkFolderPermissions(user, relativePath);

        if (!hasAccess) {
          return null; // Skip file if the user doesn't have permission
        }

        const cachedFile = await readJsonHeaderFromFile(file);
        if (cachedFile) {
          return createQueryFile(file, cachedFile);
        }
        return null;
      }),
    );

    // Filter out null results
    return queryFiles
      .filter((queryFile): queryFile is QueryFile => queryFile !== null)
      .map((queryFile) => ({
        ...queryFile,
        filePath: queryFile.filePath.replace(BASE_DIRECTORY, ''),
      }));
  } catch (error) {
    auditLogger.error(`Error reading files from directory ${directory}: ${error.message}`);
    return [];
  }
};

// Modularized filter options application
const applyFilterOptions = async (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filter: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<string[] | number[] | boolean[] | Record<string, any>[]> => {
  // If the filter has a query, run it and store the results in options
  if (filter?.options?.query) {
    const results = await db.sequelize.query(
      filter.options.query.sqlQuery,
      { type: QueryTypes.SELECT },
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return results.map((result: any) => result[filter.options.query.column]);
  }

  // If the filter has static values, store them in options
  if (filter?.options?.staticValues) {
    return filter.options.staticValues;
  }

  return null;
};

// generate conditions based on data type and supported flags
const generateConditions = (filter: HeaderFilter): string[] => {
  const { type, supportsFuzzyMatch, supportsExclusion } = filter;
  const conditions: string[] = [];

  if (type === FilterType.StringArray) {
    conditions.push(supportsFuzzyMatch ? 'ctn' : 'in');
    if (supportsExclusion) {
      conditions.push(supportsFuzzyMatch ? 'nctn' : 'nin');
    }
  } else if (type === FilterType.DateArray) {
    conditions.push('aft', 'win', 'in');
    if (supportsExclusion) {
      conditions.push('bef');
    }
  } else if (type === FilterType.IntegerArray) {
    conditions.push('in');
    if (supportsExclusion) {
      conditions.push('nin');
    }
  }

  return conditions;
};

// Modularized filter processing
const processFilters = async (cachedFile: CachedFile, returnOptions = false): Promise<Filters> => {
  const filters: Filters = {};

  await Promise.all(
    cachedFile.jsonHeader.filters.map(async (filter) => {
      const filterData: Filter = {
        id: filter.name,
        display: filter.display,
        type: filter.type,
        description: filter.description,
        conditions: generateConditions(filter),
      };

      // Add default values if present
      if (filter.options?.defaultValues) {
        filterData.defaultValues = filter.options.defaultValues;
      }

      // Apply filter options (query or static values)
      if (returnOptions) {
        const options = await applyFilterOptions(filter);
        if (options) {
          filterData.options = options;
        }
      }

      filters[filter.name] = filterData;
    }),
  );

  return filters;
};

// Helper function to generate artificial filters for sorting and pagination
const generateArtificialFilters = (cachedFile: CachedFile, currentUserId: number): Filters => {
  const artificialFilters: Filters = {};

  // eslint-disable-next-line @typescript-eslint/dot-notation
  artificialFilters['currentUserId'] = {
    id: 'currentUserId',
    type: FilterType.IntegerArray,
    description: 'A static filter to allow restriction to the current user.',
    options: [currentUserId],
    defaultValues: [currentUserId],
  };

  // For single dataset output (normal case)
  if (cachedFile.jsonHeader.output.schema && !cachedFile.jsonHeader.output.multipleDataSets) {
    // Generate artificial filters for sorting if supportsSorting is true
    if (cachedFile.jsonHeader.output.sorting) {
      artificialFilters['sortOrder.column'] = {
        id: 'sortOrder.column',
        type: FilterType.StringArray,
        description: 'The column to sort by',
        options: cachedFile.jsonHeader.output.schema.map((column) => column.columnName),
        defaultValues: cachedFile.jsonHeader.output.sorting.default.map((sort) => sort.name),
      };
      artificialFilters['sortOrder.direction'] = {
        id: 'sortOrder.direction',
        type: FilterType.StringArray,
        description: 'The direction to sort (ASC or DESC)',
        options: ['ASC', 'DESC'],
        defaultValues: cachedFile.jsonHeader.output.sorting.default.map((sort) => sort.order),
      };
    }

    // Generate artificial filters for pagination if supportsPagination is true
    if (cachedFile.jsonHeader.output.supportsPagination) {
      artificialFilters['pagination.page'] = {
        id: 'pagination.page',
        type: FilterType.IntegerArray,
        description: 'The page number to retrieve',
        defaultValues: [0], // Default to the first page
      };
      artificialFilters['pagination.size'] = {
        id: 'pagination.size',
        type: FilterType.IntegerArray,
        description: 'The number of records to retrieve per page',
        defaultValues: [MAX_POSTGRES_RECORD_LIMIT], // Max number of records PostgreSQL supports
      };
    }
  }

  // For multi-dataset output
  if (cachedFile.jsonHeader.output.multipleDataSets) {
    cachedFile.jsonHeader.output.multipleDataSets.forEach((dataSet) => {
      const prefix = dataSet.name;

      // Generate artificial filters for sorting if supportsSorting is true
      if (dataSet.sorting) {
        artificialFilters[`${prefix}.sortOrder.column`] = {
          id: `${prefix}.sortOrder.column`,
          type: FilterType.StringArray,
          description: `The column to sort by for dataset ${prefix}`,
          options: dataSet.schema.map((column) => column.columnName),
          defaultValues: dataSet.sorting.default.map((sort) => sort.name),
        };

        artificialFilters[`${prefix}.sortOrder.direction`] = {
          id: `${prefix}.sortOrder.direction`,
          type: FilterType.StringArray,
          description: `The direction to sort (ASC or DESC) for dataset ${prefix}`,
          options: ['ASC', 'DESC'],
          defaultValues: dataSet.sorting.default.map((sort) => sort.order),
        };
      }

      // Generate artificial filters for pagination if supportsPagination is true
      if (dataSet.supportsPagination) {
        artificialFilters[`${prefix}.pagination.page`] = {
          id: `${prefix}.pagination.page`,
          type: FilterType.IntegerArray,
          description: `The page number to retrieve for dataset ${prefix}`,
          defaultValues: [0], // Default to the first page
        };

        artificialFilters[`${prefix}.pagination.size`] = {
          id: `${prefix}.pagination.size`,
          type: FilterType.IntegerArray,
          description: `The number of records to retrieve per page for dataset ${prefix}`,
          defaultValues: [MAX_POSTGRES_RECORD_LIMIT], // Max number of records PostgreSQL supports
        };
      }
    });

    // Add a filter to allow returning only a subset of the multiple datasets
    artificialFilters.dataSetSelection = {
      id: 'dataSetSelection',
      type: FilterType.StringArray,
      description: 'Select which datasets to include in the result',
      options: cachedFile.jsonHeader.output.multipleDataSets
        .map((dataSet) => dataSet.name)
        .filter((name) => name !== 'process_log'),
      defaultValues: cachedFile.jsonHeader.output.multipleDataSets
        .map((dataSet) => dataSet.name)
        .filter((name) => name !== 'process_log'),
    };
  }

  return artificialFilters;
};

// Optional chaining and modularizing parts of `readFiltersFromFile`
const readFiltersFromFile = async (
  filePath: string,
  currentUserId: number,
  returnOptions = false,
): Promise<Filters> => {
  // Use the cached file or load it fresh via readJsonHeaderFromFile
  const cachedFile = await readJsonHeaderFromFile(filePath);
  if (!cachedFile) {
    throw new Error(`Unable to read and parse the JSON header from file: ${filePath}`);
  }

  // Process and combine the actual filters and artificial filters
  const filters = {
    ...(await processFilters(cachedFile, returnOptions)),
    ...generateArtificialFilters(cachedFile, currentUserId),
  };

  return filters;
};

// Validate type using the enum
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const validateType = (expectedType: FilterType, value: any): boolean => {
  switch (expectedType) {
    case FilterType.IntegerArray:
      return value.every((v, i, arr) => {
        if (Number.isInteger(v)) {
          return true;
        }
        if (!Number.isNaN(Number(v))) {
          // eslint-disable-next-line no-param-reassign
          arr[i] = Number(v); // Convert string to number
          return true;
        }
        return false;
      });
    case FilterType.DateArray:
      return Array.isArray(value) && value.every((v) => !Number.isNaN(Date.parse(v)));
    case FilterType.StringArray:
      return Array.isArray(value) && value.every((v) => typeof v === 'string');
    case FilterType.BooleanArray:
      return Array.isArray(value) && value.every((v) => typeof v === 'boolean');
    default:
      return false;
  }
};

// Preprocess and validate filters
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const preprocessAndValidateFilters = (filters: Filters, input: Record<string, any>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};
  const errors = {
    invalidFilters: [] as string[],
    invalidTypes: [] as string[],
  };

  Object.keys(input).forEach((key) => {
    const suffix = Object.keys(suffixMapping).find((s) => key.endsWith(s));
    let newKey = key;
    const baseKey = newKey.split('.')[0];
    let newValue = input[key];

    if (suffix) {
      const mappedSuffix = suffixMapping[suffix];
      newKey = key.replace(suffix, mappedSuffix ?? '');

      const isDateArrayFilter = (suf, filterType) => (suf === '.win' || suf === '.in')
        && filterType === FilterType.DateArray;

      const isArrayWithSeparator = (arr, separator) => Array.isArray(arr)
        && arr.some((item) => typeof item === 'string' && item.includes(separator));

      const splitValue = (value, separator) => (Array.isArray(value)
        ? value.flatMap((item) => (typeof item === 'string'
          ? item.split(separator)
          : item))
        : value.split(separator));

      if (isDateArrayFilter(suffix, filters[baseKey]?.type)) {
        if (!Array.isArray(newValue)) {
          newValue = splitValue(newValue, '-');
        } else if (isArrayWithSeparator(newValue, '-')) {
          newValue = splitValue(newValue, '-');
        }
      } else if (suffix === '.in' || suffix === '.nin') {
        if (!Array.isArray(newValue) && newValue.includes(',')) {
          newValue = splitValue(newValue, ',');
        } else if (isArrayWithSeparator(newValue, ',')) {
          newValue = splitValue(newValue, ',');
        }
      }
    }

    if (!Array.isArray(newValue)) {
      newValue = [newValue];
    }

    if (!filters[baseKey]) {
      errors.invalidFilters.push(`Invalid filter: ${newKey}`);
    } else {
      const expectedType = filters[baseKey].type as FilterType;
      if (!validateType(expectedType, newValue)) {
        errors.invalidTypes.push(`Invalid type for filter ${newKey}: expected ${expectedType} received ${newValue}`);
      }
    }

    result[newKey] = newValue;
  });

  // Apply default values for filters that were not provided in the input
  Object.keys(filters).forEach((filterKey) => {
    if (!result[filterKey] && filters[filterKey]?.defaultValues) {
      result[filterKey] = filters[filterKey].defaultValues;
    }
  });

  return { result, errors };
};

// Helper function to set filters in the database
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setFilters = async (filterValues: FilterValues): Promise<any[]> => Promise.all(
  Object.entries(filterValues).map(async ([key, value]) => {
    if (key.endsWith('.not')) {
      const baseKey = key.slice(0, -4);

      return Promise.all([
        db.sequelize.query(
          'SELECT set_config($1, $2, false)',
          {
            bind: [`ssdi.${baseKey}`, JSON.stringify(value)],
            type: db.sequelize.QueryTypes.SELECT,
          },
        ),
        db.sequelize.query(
          'SELECT set_config($1, $2, false)',
          {
            bind: [`ssdi.${key}`, JSON.stringify(true)],
            type: db.sequelize.QueryTypes.SELECT,
          },
        ),
      ]);
    }
    return db.sequelize.query(
      'SELECT set_config($1, $2, false)',
      {
        bind: [`ssdi.${key}`, JSON.stringify(value)],
        type: db.sequelize.QueryTypes.SELECT,
      },
    );
  }),
);

// Helper function to generate a string representation of the filter values
const generateFilterString = (filterValues: FilterValues): string => Object.entries(filterValues)
  .map(([key, value]) => {
    const formattedValue = Array.isArray(value) ? value.join('-') : value;
    return `${key}_${formattedValue}`;
  })
  .join('_');

// Execute query asynchronously and set read-only transaction
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const executeQuery = async (filePath: string): Promise<any> => {
  const resolvedFilePath = safeResolvePath(filePath);

  if (!cache.has(resolvedFilePath)) {
    const cachedFile = await readJsonHeaderFromFile(resolvedFilePath);
    if (cachedFile) {
      cache.set(resolvedFilePath, cachedFile);
    } else {
      throw new Error(`Unable to read and parse the JSON header from file: ${resolvedFilePath}`);
    }
  }

  const cachedFile = cache.get(resolvedFilePath) as CachedFile;
  const { query } = cachedFile;

  if (typeof query !== 'string') {
    throw new Error('The query must be a string');
  }

  try {
    const result = await db.sequelize.query(
      query,
      {
        type: QueryTypes.SELECT,
      },
    );
    return result;
  } catch (error) {
    throw new Error(`Query failed: ${error.message}`);
  }
};

export {
  MAX_POSTGRES_RECORD_LIMIT,
  FilterType,
  suffixMapping,
  HeaderFilter,
  HeaderStructure,
  CachedFile,
  QueryFile,
  Filter,
  Filters,
  FilterValues,
  CachedFilters,
  BASE_DIRECTORY,
  cache,
  sanitizeFilename,
  checkFolderPermissions,
  safeResolvePath,
  isFile,
  isValidJsonHeader,
  checkDirectoryExists,
  readJsonHeaderFromFile,
  readFilesRecursively,
  createQueryFile,
  listQueryFiles,
  applyFilterOptions,
  generateConditions,
  processFilters,
  generateArtificialFilters,
  readFiltersFromFile,
  validateType,
  preprocessAndValidateFilters,
  setFilters,
  generateFilterString,
  executeQuery,
};
