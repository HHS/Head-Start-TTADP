import { v4 as uuid } from 'uuid';
import { compareFilters } from '../helpers';

describe('compareFilters', () => {
  it('returns true if arrays are the same', async () => {
    const arr1 = [
      {
        id: uuid(),
        topic: 'grantNumber',
        condition: 'Contains',
        query: 'toast',
      },
      {
        id: uuid(),
        topic: 'startDate',
        condition: 'Is within',
        query: '2020/09/01-2020/10/01',
      },
    ];
    const arr2 = [
      {
        id: uuid(),
        topic: 'startDate',
        condition: 'Is within',
        query: '2020/09/01-2020/10/01',
      },
      {
        id: uuid(),
        topic: 'grantNumber',
        condition: 'Contains',
        query: 'toast',
      },
    ];
    expect(compareFilters(arr1, arr2)).toBe(true);
  });

  it('returns false if arrays are different', async () => {
    const arr1 = [
      {
        id: uuid(),
        topic: 'startDate',
        condition: 'Is within',
        query: '2020/09/01-2020/10/01',
      },
      {
        id: uuid(),
        topic: 'grantNumber',
        condition: 'Contains',
        query: 'toast',
      },
    ];
    const arr2 = [
      {
        id: uuid(),
        topic: 'recipientName',
        condition: 'Contains',
        query: 'toast',
      },
      {
        id: uuid(),
        topic: 'startDate',
        condition: 'Is within',
        query: '2020/09/01-2020/10/01',
      },
    ];
    const result = compareFilters(arr1, arr2);
    expect(result).toBe(false);
  });

  it('returns false if arrays have different lengths', async () => {
    const arr1 = [
      {
        id: uuid(),
        topic: 'startDate',
        condition: 'Is within',
        query: '2020/09/01-2020/10/01',
      },
      {
        id: uuid(),
        topic: 'grantNumber',
        condition: 'Contains',
        query: 'toast',
      },
    ];
    const arr2 = [
      {
        id: uuid(),
        topic: 'startDate',
        condition: 'Is within',
        query: '2020/09/01-2020/10/01',
      },
    ];
    const result = compareFilters(arr1, arr2);
    expect(result).toBe(false);
  });
});
