import {
  sequelize,
} from '../models';
import orderReportsBy from './orderReportsBy';

describe('orderReportsBy', () => {
  it('should sort by author', () => {
    const result = orderReportsBy('author', 'ASC');
    expect(result).toEqual([[sequelize.literal('authorName ASC')]]);
  });

  it('should sort by collaborators', () => {
    const result = orderReportsBy('collaborators', 'DESC');
    expect(result).toEqual([[sequelize.literal('collaboratorName DESC NULLS LAST')]]);
  });

  it('should sort by topics', () => {
    const result = orderReportsBy('topics', 'ASC');
    expect(result).toEqual([[sequelize.literal('topics ASC')]]);
  });

  it('should sort by regionId', () => {
    const result = orderReportsBy('regionId', 'DESC');
    expect(result).toEqual([
      ['regionId', 'DESC'],
      ['id', 'DESC'],
    ]);
  });

  it('should sort by activityRecipients', () => {
    const result = orderReportsBy('activityRecipients', 'ASC');
    expect(result).toEqual([
      [sequelize.literal('recipientName ASC')],
      [sequelize.literal('otherEntityName ASC')],
    ]);
  });

  it('should sort by calculatedStatus', () => {
    const result = orderReportsBy('calculatedStatus', 'DESC');
    expect(result).toEqual([['calculatedStatus', 'DESC']]);
  });

  it('should sort by startDate', () => {
    const result = orderReportsBy('startDate', 'ASC');
    expect(result).toEqual([['startDate', 'ASC']]);
  });

  it('should sort by updatedAt', () => {
    const result = orderReportsBy('updatedAt', 'DESC');
    expect(result).toEqual([['updatedAt', 'DESC']]);
  });

  it('should sort by approvedAt', () => {
    const result = orderReportsBy('approvedAt', 'ASC');
    expect(result).toEqual([['approvedAt', 'ASC']]);
  });

  it('should sort by createdAt', () => {
    const result = orderReportsBy('createdAt', 'ASC');
    expect(result).toEqual([['createdAt', 'ASC']]);
  });

  it('should default to empty string if sortBy parameter is invalid', () => {
    const result = orderReportsBy('invalid', 'ASC');
    expect(result).toEqual('');
  });
});
