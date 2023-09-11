import { remapData } from './modelUtils';

describe('remapData', () => {
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

    expect(remapData(jsonData, remappingDefinition)).toEqual(expectedData);
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

    expect(remapData(expectedData, remappingDefinition, true)).toEqual(jsonData);
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

    expect(remapData(dataWithEmptyParent, remappingDefinition, true)).toEqual(expectedData);
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

    expect(remapData(dataWithNonEmptyParent, remappingDefinition)).toEqual(dataWithNonEmptyParent);
  });
});
