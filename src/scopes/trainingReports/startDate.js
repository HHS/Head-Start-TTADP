import { Op } from 'sequelize'

export function beforeStartDate(date) {
  return {
    [Op.and]: {
      'data.startDate': {
        [Op.lte]: date[0],
      },
    },
  }
}

export function afterStartDate(date) {
  return {
    [Op.and]: {
      'data.startDate': {
        [Op.gte]: date[0],
      },
    },
  }
}

export function withinStartDates(dates) {
  const splitDates = dates[0].split('-')
  if (splitDates.length !== 2) {
    return {}
  }
  const startDate = splitDates[0]
  const endDate = splitDates[1]
  return {
    [Op.and]: {
      'data.startDate': {
        [Op.between]: [startDate, endDate],
      },
    },
  }
}
