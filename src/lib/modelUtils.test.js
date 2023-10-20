import { DataTypes, Model } from 'sequelize';
import { getColumnInformation, filterDataToModel, remap } from './modelUtils';

describe('getColumnInformation', () => {
  it('should return the column information of a model', async () => {
    const mockModel = {
      describe: jest.fn().mockResolvedValue({
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      }),
    };

    const result = await getColumnInformation(mockModel);

    expect(result).toEqual([
      { columnName: 'id', dataType: DataTypes.INTEGER, allowNull: false },
      { columnName: 'name', dataType: DataTypes.STRING, allowNull: true },
    ]);
    expect(mockModel.describe).toHaveBeenCalledTimes(1);
  });
});

describe('filterDataToModel', () => {
  it('should filter data based on model columns', async () => {
    const mockModel = {
      describe: jest.fn().mockResolvedValue({
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      }),
    };

    const data = {
      id: 1,
      name: 'John Doe',
      age: 25,
    };

    const result = await filterDataToModel(data, mockModel);

    expect(result).toEqual({
      matched: { id: 1, name: 'John Doe' },
      unmatched: { age: 25 },
    });
    expect(mockModel.describe).toHaveBeenCalledTimes(1);
  });

  it('should handle null values and data type mismatch', async () => {
    const mockModel = {
      describe: jest.fn().mockResolvedValue({
        id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        name: {
          type: DataTypes.STRING,
          allowNull: true,
        },
        email: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      }),
    };

    const data = {
      id: null,
      name: 123,
      age: '25',
      email: null,
    };

    const result = await filterDataToModel(data, mockModel);

    expect(result).toEqual({
      matched: { email: null },
      unmatched: { id: null, name: 123, age: '25' },
    });
    expect(mockModel.describe).toHaveBeenCalledTimes(1);
  });
});

describe('remap', () => {
  const jsonData = {
    name: 'John',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'New York',
      country: 'USA',
    },
  };

  const remappingDefinition = {
    name: 'person.name',
    age: 'person.age',
    'address.street': 'person.address.street',
    'address.city': 'person.address.city',
    'address.country': 'person.address.country',
  };

  it('should remap the data based on the remapping definition', () => {
    const expectedData = {
      person: {
        name: 'John',
        age: 30,
        address: {
          street: '123 Main St',
          city: 'New York',
          country: 'USA',
        },
      },
    };

    expect(remap(jsonData, remappingDefinition).mapped).toEqual(expectedData);
  });

  it('should reverse remap the data if reverse flag is true', () => {
    const expectedData = {
      person: {
        name: 'John',
        age: 30,
        address: {
          street: '123 Main St',
          city: 'New York',
          country: 'USA',
        },
      },
    };

    expect(remap(expectedData, remappingDefinition, { reverse: true }).mapped).toEqual(jsonData);
  });

  it('should remove empty parent objects/arrays after remapping', () => {
    const dataWithEmptyParent = {
      person: {
        name: 'John',
        age: 30,
      },
    };

    const expectedData = {
      name: 'John',
      age: 30,
    };

    expect(remap(
      dataWithEmptyParent,
      remappingDefinition,
      { reverse: true },
    ).mapped).toEqual(expectedData);
  });

  it('should not remove non-empty parent objects/arrays after remapping', () => {
    const dataWithNonEmptyParent = {
      person: {
        name: 'John',
        age: 30,
        address: {
          street: '123 Main St',
          city: 'New York',
          country: 'USA',
        },
      },
    };

    expect(remap(
      dataWithNonEmptyParent,
      remappingDefinition,
    ).mapped).toEqual(dataWithNonEmptyParent);
  });

  const jsonData2 = {
    id: 1,
    name: 'John',
    age: 30,
    address: {
      street: '123 Main St',
      city: 'New York',
      country: 'USA',
    },
  };

  const remappingDefinition2 = {
    id: 'userId',
    name: 'fullName',
    address: 'location',
  };

  it('should remap the data based on the provided remapping definition', () => {
    const options = {
      reverse: false,
      deleteMappedValues: true,
      deleteEmptyParents: true,
      keepUnmappedValues: false,
    };

    const expectedRemappedData = {
      userId: 1,
      fullName: 'John',
      location: {
        street: '123 Main St',
        city: 'New York',
        country: 'USA',
      },
    };

    expect(remap(jsonData2, remappingDefinition2, options).mapped).toEqual(expectedRemappedData);
  });

  it('should keep unmapped values when keepUnmappedValues flag is set to true', () => {
    const options = {
      reverse: false,
      deleteMappedValues: true,
      deleteEmptyParents: true,
      keepUnmappedValues: true,
    };

    const expectedRemappedData = {
      userId: 1,
      fullName: 'John',
      age: 30,
      location: {
        street: '123 Main St',
        city: 'New York',
        country: 'USA',
      },
    };

    expect(remap(jsonData2, remappingDefinition2, options).mapped).toEqual(expectedRemappedData);
  });

  it('should delete mapped values when deleteMappedValues flag is set to true', () => {
    const options = {
      reverse: false,
      deleteMappedValues: true,
      deleteEmptyParents: true,
      keepUnmappedValues: false,
    };

    const expectedRemappedData = {
      userId: 1,
      fullName: 'John',
      location: {
        street: '123 Main St',
        city: 'New York',
        country: 'USA',
      },
    };

    expect(remap(jsonData2, remappingDefinition2, options).mapped).toEqual(expectedRemappedData);
  });

  it('should delete empty parent structures when deleteEmptyParents flag is set to true', () => {
    const options = {
      reverse: false,
      deleteMappedValues: true,
      deleteEmptyParents: false,
      keepUnmappedValues: true,
    };

    const remappingDefinition3 = {
      id: 'userId',
      name: 'fullName',
      'address.street': 'location.street',
      'address.city': 'location.city',
      'address.country': 'location.country',
    };

    const expectedRemappedData = {
      userId: 1,
      fullName: 'John',
      age: 30,
      address: {},
      location: {
        street: '123 Main St',
        city: 'New York',
        country: 'USA',
      },
    };

    expect(remap(jsonData2, remappingDefinition3, options).mapped).toEqual(expectedRemappedData);
  });

  it('should map an array of values to an array of objects with an attribute for the value', () => {
    const jsonData4 = {
      values: [1, 2, 3, 4, 5],
    };

    const remappingDefinition4 = {
      'values.*': 'items.*.value',
    };

    const options = {
      reverse: false,
      deleteMappedValues: true,
      deleteEmptyParents: true,
      keepUnmappedValues: false,
    };

    const expectedRemappedData = {
      items: [
        { value: 1 },
        { value: 2 },
        { value: 3 },
        { value: 4 },
        { value: 5 },
      ],
    };

    expect(remap(jsonData4, remappingDefinition4, options).mapped).toEqual(expectedRemappedData);
  });

  it('should map multiple arrays of values to an array', () => {
    const jsonData4 = {
      states: [
        { name: 'NV', cities: ['Las Vegas', 'Henderson', 'Reno'] },
        { name: 'CA', cities: ['Los Angeles', 'San Diego ', 'San Jose', 'San Francisco'] },
      ],
    };

    const remappingDefinition4 = {
      'states.*.cities.*': 'cities.*',
    };

    const options = {
      reverse: false,
      deleteMappedValues: true,
      deleteEmptyParents: true,
      keepUnmappedValues: false,
    };

    const expectedRemappedData = {
      cities: [
        'Las Vegas',
        'Henderson',
        'Reno',
        'Los Angeles',
        'San Diego ',
        'San Jose',
        'San Francisco',
      ],
    };

    expect(remap(jsonData4, remappingDefinition4, options).mapped).toEqual(expectedRemappedData);
  });
});
