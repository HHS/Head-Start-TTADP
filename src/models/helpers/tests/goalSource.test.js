// Import the functions to be tested
const { onlyAllowTrGoalSourceForGoalsCreatedViaTr } = require('../goalSource');

describe('goalSource test', () => {
  describe('trGoalSourceValidations', () => {
    const sequelize = {};
    const instance = {
      changed: jest.fn(),
      set: jest.fn(),
    };
    const options = {
      fields: [],
    };

    afterEach(() => jest.clearAllMocks());
    it('throws an error for invalid tr source', () => {
      instance.changed.mockReturnValueOnce(['source']);
      instance.source = 'invalid_tr_source';
      instance.createdVia = 'tr';
      expect(() => {
        onlyAllowTrGoalSourceForGoalsCreatedViaTr(sequelize, instance, options);
      }).toThrowError('Goals created via a Training Report must have a source of "Training event".');
    });

    it('should not throw an error for valid tr source', () => {
      instance.changed.mockReturnValueOnce(['source']);
      instance.source = 'Training event';
      instance.createdVia = 'tr';
      expect(() => {
        onlyAllowTrGoalSourceForGoalsCreatedViaTr(sequelize, instance, options);
      }).not.toThrowError();
    });
  });
});
