const { DataTypes } = require('sequelize');
const db = require('../..');

// Import the functions to be tested
const {
  getEnumColumnDefinitions,
  getValidValues,
  validateChangedOrSetEnums,
} = require('../enum');

describe('enum', () => {
  describe('getEnumColumnDefinitions', () => {
    it('should return an object with enum column definitions', () => {
      // Define a mock model with enum columns
      const model = {
        rawAttributes: {
          id: {
            type: DataTypes.INTEGER,
          },
          name: {
            type: DataTypes.STRING,
          },
          status: {
            type: DataTypes.ENUM('active', 'inactive'),
          },
          role: {
            type: DataTypes.ENUM('admin', 'user'),
          },
        },
      };

      // Call the function to get enum column definitions
      const result = getEnumColumnDefinitions(db.sequelize, model);

      // Assert that the result is an object with the correct keys and values
      expect(result).toEqual({
        status: model.rawAttributes.status,
        role: model.rawAttributes.role,
      });
    });

    it('should return an empty object if no enum columns are found', () => {
      // Define a mock model without enum columns
      const model = {
        rawAttributes: {
          id: {
            type: DataTypes.INTEGER,
          },
          name: {
            type: DataTypes.STRING,
          },
        },
      };

      // Call the function to get enum column definitions
      const result = getEnumColumnDefinitions(db.sequelize, model);

      // Assert that the result is an empty object
      expect(result).toEqual({});
    });
  });

  describe('getValidValues', () => {
    it('should return an array of valid values for an enum column definition', () => {
      // Define a mock column definition
      const columnDef = {
        type: {
          values: ['active', 'inactive'],
        },
        allowNull: false,
      };

      // Call the function to get valid values
      const result = getValidValues(columnDef);

      // Assert that the result is an array with the correct values
      expect(result).toEqual(['active', 'inactive']);
    });

    it('should include null as a valid value if allowNull is true', () => {
      // Define a mock column definition
      const columnDef = {
        type: {
          values: ['admin', 'user'],
        },
        allowNull: true,
      };

      // Call the function to get valid values
      const result = getValidValues(columnDef);

      // Assert that the result is an array with the correct values
      expect(result).toEqual(['admin', 'user', null]);
    });
  });

  describe('validateChangedOrSetEnums', () => {
    let instance;

    beforeEach(() => {
      // Define a mock model with enum columns
      const model = {
        rawAttributes: {
          id: {
            type: DataTypes.INTEGER,
          },
          name: {
            type: DataTypes.STRING,
          },
          status: {
            type: DataTypes.ENUM('active', 'inactive'),
            allowNull: true,
          },
          role: {
            type: DataTypes.ENUM('admin', 'user'),
            allowNull: false,
          },
        },
      };

      // Create a mock instance of the model
      instance = {
        constructor: model,
        changed: jest.fn().mockReturnValue(['status']),
        status: 'active',
        set: jest.fn(),
      };
    });

    it('should set the value to null if currentValue is an empty string and allowNull is true', () => {
      instance.status = '';
      // Call the function to validate and set enum values
      validateChangedOrSetEnums(db.sequelize, instance);

      // Assert that the set method was called with the correct arguments
      expect(instance.set).toHaveBeenCalledWith('status', null);
    });

    it('should throw an error if currentValue is not a valid value for the column', () => {
      // Update the instance to have an invalid value for the status column
      instance.status = 'invalid';

      // Call the function to validate and set enum values
      expect(() => {
        validateChangedOrSetEnums(db.sequelize, instance);
      }).toThrow("Invalid value of 'invalid' passed for status");
    });
  });
});
