import { DataType, Model } from 'sequelize';

// Define the mapping between Sequelize data types and TypeScript data types
const dataTypeMapping: Record<string, string> = {
  [DataType.STRING]: 'string',
  [DataType.INTEGER]: 'number',
  [DataType.FLOAT]: 'number',
  [DataType.DOUBLE]: 'number',
  [DataType.BOOLEAN]: 'boolean',
  [DataType.BIGINTEGER]: 'number',
  // Add more mappings as needed
};

// Get the column information using the describe method
const getColumnInformation = async (model: typeof Model) => {
  const tableDetails = await model.describe();
  const columns = Object.entries(tableDetails).map(([columnName, columnDetails]) => ({
    columnName,
    dataType: columnDetails.type,
    allowNull: columnDetails.allowNull,
  }));
  return columns;
};

const filterDataToModel = async (
  data: Record<string, any>,
  model: typeof Model,
): Promise<{ matched: Record<string, any>, unmatched: Record<string, any> }> => {
  const modelData = await getColumnInformation(model);

  return Object.entries(data)
    .reduce((acc, [key, value]) => {
      const matchColumn = modelData.find((md) => md.columnName === key);

      if (matchColumn
        && ((value === null && matchColumn.allowNull)
          || (typeof value === dataTypeMapping[matchColumn.dataType]))
      ) {
        acc.matched[key] = value;
      } else {
        acc.unmatched[key] = value;
      }

      return acc;
    }, { matched: {}, unmatched: {} });
};

const switchAttributeNames = (
  obj: Record<string, any>,
  remappings: Record<string, string>,
): Record<string, any> => {
  const switchedObj: Record<string, any> = {};

  Object.entries(obj)
    .forEach(([key, value]) => {
      switchedObj[remappings[key] || key] = value;
    });

  return switchedObj;
};

export {
  getColumnInformation,
  filterDataToModel,
  switchAttributeNames,
};
