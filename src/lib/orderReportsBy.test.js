import orderReportsBy from './orderReportsBy'
import { sequelize } from '../models'

describe('orderReportsBy', () => {
  it('returns the correct values', () => {
    let sort = orderReportsBy('author', 'asc')
    expect(sort).toStrictEqual([[sequelize.literal('authorName asc')]])

    sort = orderReportsBy('collaborators', 'asc')
    expect(sort).toStrictEqual([[sequelize.literal('collaboratorName asc NULLS LAST')]])

    sort = orderReportsBy('topics', 'asc')
    expect(sort).toStrictEqual([[sequelize.literal('topics asc')]])

    sort = orderReportsBy('regionId', 'asc')
    expect(sort).toStrictEqual([
      ['regionId', 'asc'],
      ['id', 'asc'],
    ])

    sort = orderReportsBy('activityRecipients', 'asc')
    expect(sort).toStrictEqual([[sequelize.literal('recipientName asc')], [sequelize.literal('otherEntityName asc')]])

    sort = orderReportsBy('calculatedStatus', 'asc')
    expect(sort).toStrictEqual([['calculatedStatus', 'asc']])

    sort = orderReportsBy('startDate', 'asc')
    expect(sort).toStrictEqual([['startDate', 'asc']])

    sort = orderReportsBy('updatedAt', 'asc')
    expect(sort).toStrictEqual([['updatedAt', 'asc']])

    sort = orderReportsBy('approvedAt', 'asc')
    expect(sort).toStrictEqual([['approvedAt', 'asc']])

    sort = orderReportsBy('createdAt', 'asc')
    expect(sort).toStrictEqual([['createdAt', 'asc']])

    sort = orderReportsBy('fuzzbucket', 'desc')
    expect(sort).toStrictEqual('')
  })
})
