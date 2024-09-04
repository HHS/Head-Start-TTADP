import fs from 'fs';
import path from 'path';
import { QueryTypes } from 'sequelize';
import db from '../models';
import { auditLogger } from '../logger';

interface HeaderStructure {
  name: string;
  description: {
    standard: string;
    technical: string;
  };
  output: {
    defaultName: string;
    schema: Array<{
      columnName: string;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: string | number | boolean | Record<string, any>;
      nullable: boolean;
      description: string;
    }>;
  };
  filters: Array<{
    name: string;
    type: string;
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
  }>;
  sorting: {
    default: Array<{
      name: string;
      order: 'ASC' | 'DESC';
    }>;
  };
  supportsSorting?: boolean;
  supportsPagination?: boolean;
}

interface CachedFile {
  jsonHeader: HeaderStructure;
  query: string;
}

interface QueryFile {
  name: string;
  description: string;
  technicalDescription: string;
  filePath: string;
  defaultOutputName: string;
}

interface Filter {
  name: string;
  type: string;
  description: string;
  supportsExclusion: boolean;
  supportsFuzzyMatch: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  options?: string[] | number[] | boolean[] | Record<string, any>[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  defaultValues?: string[] | number[] | boolean[] | Record<string, any>[];
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

// Main cache for storing parsed JSON headers and queries (assumed to be defined globally)
const cache: Map<string, CachedFile> = new Map();

// Function to extract and parse the JSON header and SQL query from the file
const readJsonHeaderFromFile = (filePath: string): CachedFile | null => {
  const fileName = path.basename(filePath, path.extname(filePath));

  // Check if the file is already in the cache
  if (cache[fileName]) {
    return cache[fileName]; // Return from cache if present
  }

  const fileContents = fs.readFileSync(filePath, 'utf8');

  // Extract the JSON block starting with "JSON:"
  const jsonMatch = fileContents.match(/JSON:\s*({[\s\S]*})/);
  // Extract the SQL query (assuming it starts after the JSON block)
  const queryMatch = fileContents.match(/\*\/([\s\S]*)/);

  if (jsonMatch && jsonMatch[1] && queryMatch && queryMatch[1]) {
    try {
      // Parse the JSON string into a JavaScript object
      const jsonHeader = JSON.parse(jsonMatch[1].trim());

      // Extract the query portion after the JSON header
      const query = queryMatch[1].trim();

      // Cache both the parsed JSON header and the query
      cache[fileName] = { jsonHeader, query };

      return { jsonHeader, query };
    } catch (error) {
      auditLogger.error(`Error parsing JSON header in file ${filePath}:`, error);
      return null;
    }
  } else {
    auditLogger.warn(`No valid JSON header or SQL query found in file ${filePath}.`);
    return null;
  }
};

// Helper function to create a QueryFile from a CachedFile
const createQueryFile = (filePath: string, cachedFile: CachedFile): QueryFile => ({
  name: cachedFile.jsonHeader.name,
  description: cachedFile.jsonHeader.description.standard, // or .technical if preferred
  technicalDescription: cachedFile.jsonHeader.description.technical,
  filePath,
  defaultOutputName: cachedFile.jsonHeader.output.defaultName,
});

// Helper function to list all query files with name and description
const listQueryFiles = (directory: string): QueryFile[] => {
  const files = fs.readdirSync(directory);

  return files
    .map((file) => {
      const filePath = path.join(directory, file);

      // Check if the file is already in the cache
      if (cache.has(filePath)) {
        return createQueryFile(filePath, cache.get(filePath) as CachedFile);
      }

      // Read the JSON header and query from the file if not cached
      const cachedFile = readJsonHeaderFromFile(filePath);

      if (cachedFile) {
        // Cache the parsed data and create the QueryFile object
        cache.set(filePath, cachedFile);
        return createQueryFile(filePath, cachedFile);
      }

      // Return null if the JSON header could not be read or parsed
      return null;
    })
    .filter((queryFile): queryFile is QueryFile => queryFile !== null); // Filter out null values
};

// Helper function to read filters from the file, with optional returnOptions
const readFiltersFromFile = async (
  filePath: string,
  returnOptions = false,
): Promise<CachedFilters> => {
  // Check if the file is already in the main cache
  if (!cache.has(filePath)) {
    // Process the file into the cache if it's not already cached
    const cachedFile = readJsonHeaderFromFile(filePath);
    if (cachedFile) {
      cache.set(filePath, cachedFile);
    } else {
      throw new Error(`Unable to read and parse the JSON header from file: ${filePath}`);
    }
  }

  // Retrieve the cached file
  const cachedFile = cache.get(filePath) as CachedFile;

  // Initialize the filters dictionary
  const filters: Filters = {};

  if (returnOptions) {
    // Set transaction to READ ONLY, this will fail the transaction if any tables are modified
    await db.sequelize.query('SET TRANSACTION READ ONLY;', { type: QueryTypes.RAW });
  }

  // Iterate through the filters in the JSON header and convert them to a dictionary format
  await Promise.all(
    cachedFile.jsonHeader.filters.map(async (filter) => {
      const filterData: Filter = {
        name: filter.name,
        type: filter.type,
        description: filter.description,
        supportsExclusion: filter.supportsExclusion || false,
        supportsFuzzyMatch: filter.supportsFuzzyMatch || false,
      };

      if (returnOptions) {
        // If the filter has a query, run it and store the results in options
        if (filter.options?.query) {
          const results = await db.sequelize.query(filter.options.query.sqlQuery, {
            type: QueryTypes.SELECT,
          });
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          filterData.options = results.map((result: any) => result[filter.options.query.column]);
        } else if (filter.options?.staticValues) {
          // If the filter has static values, store them in options
          filterData.options = filter.options.staticValues;
        }

        // If the filter has default values, store them in defaultValues
        if (filter.options?.defaultValues) {
          filterData.defaultValues = filter.options.defaultValues;
        }
      }

      // Add the filter to the dictionary
      filters[filter.name] = filterData;
    }),
  );

  // Generate artificial filters for sorting if supportsSorting is true
  if (cachedFile.jsonHeader.supportsSorting) {
    const sortOrderColumnFilter: Filter = {
      name: 'sortOrder.column',
      type: 'string[]',
      description: 'The column to sort by',
      supportsExclusion: false,
      supportsFuzzyMatch: false,
      options: cachedFile.jsonHeader.output.schema.map((column) => column.columnName),
      defaultValues: cachedFile.jsonHeader.sorting.default.map((sort) => sort.name),
    };

    const sortOrderDirectionFilter: Filter = {
      name: 'sortOrder.direction',
      type: 'string[]',
      description: 'The direction to sort (ASC or DESC)',
      supportsExclusion: false,
      supportsFuzzyMatch: false,
      options: ['ASC', 'DESC'],
      defaultValues: cachedFile.jsonHeader.sorting.default.map((sort) => sort.order),
    };

    filters['sortOrder.column'] = sortOrderColumnFilter;
    filters['sortOrder.direction'] = sortOrderDirectionFilter;
  }

  // Generate artificial filters for pagination if supportsPagination is true
  if (cachedFile.jsonHeader.supportsPagination) {
    const paginationPageFilter: Filter = {
      name: 'pagination.page',
      type: 'number',
      description: 'The page number to retrieve',
      supportsExclusion: false,
      supportsFuzzyMatch: false,
      defaultValues: [0], // Default to the first page
    };
    const paginationSizeFilter: Filter = {
      name: 'pagination.size',
      type: 'number',
      description: 'The number of records to retrieve per page',
      supportsExclusion: false,
      supportsFuzzyMatch: false,
      defaultValues: [2147483647], // Max number of records PostgreSQL supports
    };

    filters['pagination.page'] = paginationPageFilter;
    filters['pagination.size'] = paginationSizeFilter;
  }

  return {
    filters,
    supportsSorting: cachedFile.jsonHeader.supportsSorting || false,
    supportsPagination: cachedFile.jsonHeader.supportsPagination || false,
  };
};

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

// Function to validate the type of the filter values
const validateType = (
  expectedType: string,
  value: any, // eslint-disable-line @typescript-eslint/no-explicit-any
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
      return false; // Invalid type
  }
};

// Function to preprocess and validate filters, returning the result and structured errors
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const preprocessAndValidateFilters = (filters: Filters, input: Record<string, any>) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result: Record<string, any> = {};

  // Error structure
  const errors = {
    invalidFilters: [] as string[], // Filters that don't exist
    invalidTypes: [] as string[], // Filters with type mismatches
  };

  Object.keys(input).forEach((key) => {
    // Check for suffix replacements or stripping
    const suffix = Object.keys(suffixMapping).find((s) => key.endsWith(s));
    let newKey = key;
    let newValue = input[key];

    if (suffix) {
      const mappedSuffix = suffixMapping[suffix];
      newKey = key.replace(suffix, mappedSuffix ?? '');

      // Special case for .win and .in to split the value by '-' only if the
      // expected type is date[]
      if ((suffix === '.win' || suffix === '.in')
        && filters[newKey]?.type === 'date[]'
        && !Array.isArray(newValue)) {
        newValue = newValue.split('-');
      }
    }

    // Convert the value to an array if it isn't already
    if (!Array.isArray(newValue)) {
      newValue = [newValue];
    }

    // Validate the filter and its values
    if (!filters[newKey]) {
      errors.invalidFilters.push(`Invalid filter: ${newKey}`);
    } else {
      const expectedType = filters[newKey].type;
      if (!validateType(expectedType, newValue)) {
        errors.invalidTypes.push(`Invalid type for filter ${newKey}: expected ${expectedType}`);
      }
    }

    result[newKey] = newValue;
  });

  return { result, errors };
};

// Helper function to set filters in the database
const setFilters = async (
  filterValues: FilterValues,
): Promise<any[]> => Promise.all(
  Object.entries(filterValues).map(async ([key, value]) => {
    if (key.endsWith('.not')) {
      const baseKey = key.slice(0, -4); // Remove '.not' from the key

      // Run both calls in parallel
      return Promise.all([
        // First call with the base key and the passed value
        db.sequelize.query(
          'SELECT set_config($1, $2, false)',
          {
            bind: [`ssdi.${baseKey}`, JSON.stringify(value)],
            type: db.sequelize.QueryTypes.SELECT,
          },
        ),
        // Second call with the original key and 'true' as the value
        db.sequelize.query(
          'SELECT set_config($1, $2, false)',
          {
            bind: [`ssdi.${key}`, JSON.stringify(true)],
            type: db.sequelize.QueryTypes.SELECT,
          },
        ),
      ]);
    }
    // Single call for keys that don't end with '.not'
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const executeQuery = async (filePath: string): Promise<any> => {
  // Check if the file is already in the main cache
  if (!cache.has(filePath)) {
    // Process the file into the cache if it's not already cached
    const cachedFile = readJsonHeaderFromFile(filePath);
    if (cachedFile) {
      cache.set(filePath, cachedFile);
    } else {
      throw new Error(`Unable to read and parse the JSON header from file: ${filePath}`);
    }
  }

  // Retrieve the query from the cached file
  const cachedFile = cache.get(filePath) as CachedFile;
  const { query } = cachedFile;

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

// Helper function to sanitize filenames
const sanitizeFilename = (filename: string): string => filename.replace(/[^a-zA-Z0-9-_]/g, '_');

export {
  HeaderStructure,
  Filter,
  Filters,
  FilterValues,
  CachedFilters,
  QueryFile,
  CachedFile,
  suffixMapping,
  readJsonHeaderFromFile,
  createQueryFile,
  listQueryFiles,
  readFiltersFromFile,
  preprocessAndValidateFilters,
  validateType,
  setFilters,
  sanitizeFilename,
  generateFilterString,
  executeQuery,
};
