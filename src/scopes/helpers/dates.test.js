import { Op } from 'sequelize';
import {
  fieldDateFilter,
  withinFieldDates,
  filterFieldDates,
} from './dates';

describe('dates', () => {
  describe('beforeFieldDate', () => {
    it('should return the correct object', () => {
      const field = 'exampleField';
      const date = ['2021-01-01'];

      const result = fieldDateFilter(true, field, date);

      expect(result).toEqual({
        [Op.and]: {
          [`data.${field}`]: {
            [Op.lte]: '2021-01-01',
          },
        },
      });
    });
  });

  describe('afterFieldDate', () => {
    it('should return the correct object', () => {
      const field = 'exampleField';
      const date = ['2021-01-01'];

      const result = fieldDateFilter(false, field, date);

      expect(result).toEqual({
        [Op.and]: {
          [`data.${field}`]: {
            [Op.gte]: '2021-01-01',
          },
        },
      });
    });
  });

  describe('withinFieldDates', () => {
    it('should return an empty object if dates are not in the correct format', () => {
      const field = 'exampleField';
      const dates = ['2021-01-01'];

      const result = withinFieldDates(field, dates);

      expect(result).toEqual({});
    });

    it('should return the correct object if dates are in the correct format', () => {
      const field = 'exampleField';
      const dates = ['2021-01-01 - 2021-01-31'];

      const result = withinFieldDates(field, dates);

      expect(result).toEqual({
        [Op.and]: {
          [`data.${field}`]: {
            [Op.between]: ['2021-01-01', '2021-01-31'],
          },
        },
      });
    });
  });

  describe('filterFieldDates', () => {
    it('should return the correct object for "bef" key', () => {
      const field = 'exampleField';
      const query = ['2021-01-01'];

      const result = filterFieldDates(field).bef(query);

      expect(result).toEqual({
        [Op.and]: {
          [`data.${field}`]: {
            [Op.lte]: '2021-01-01',
          },
        },
      });
    });

    it('should return the correct object for "aft" key', () => {
      const field = 'exampleField';
      const query = ['2021-01-01'];

      const result = filterFieldDates(field).aft(query);

      expect(result).toEqual({
        [Op.and]: {
          [`data.${field}`]: {
            [Op.gte]: '2021-01-01',
          },
        },
      });
    });

    it('should return an empty object for "win" key if dates are not in the correct format', () => {
      const field = 'exampleField';
      const query = ['2021-01-01'];

      const result = filterFieldDates(field).win(query);

      expect(result).toEqual({});
    });

    it('should return the correct object for "win" key if dates are in the correct format', () => {
      const field = 'exampleField';
      const query = ['2021-01-01 - 2021-01-31'];

      const result = filterFieldDates(field).win(query);

      expect(result).toEqual({
        [Op.and]: {
          [`data.${field}`]: {
            [Op.between]: ['2021-01-01', '2021-01-31'],
          },
        },
      });
    });

    it('should return an empty object for "in" key if dates are not in the correct format', () => {
      const field = 'exampleField';
      const query = ['2021-01-01'];

      const result = filterFieldDates(field).in(query);

      expect(result).toEqual({});
    });

    it('should return the correct object for "in" key if dates are in the correct format', () => {
      const field = 'exampleField';
      const query = ['2021-01-01 - 2021-01-31'];

      const result = filterFieldDates(field).in(query);

      expect(result).toEqual({
        [Op.and]: {
          [`data.${field}`]: {
            [Op.between]: ['2021-01-01', '2021-01-31'],
          },
        },
      });
    });
  });
});
