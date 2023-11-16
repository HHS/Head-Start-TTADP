import { Op } from 'sequelize';

export function beforeCommunicationDate(dates: string[]) {
  return {
    [Op.and]: {
      'data.communicationDate': {
        [Op.lte]: dates[0],
      },
    },
  };
}

export function afterCommunicationDate(dates: string[]) {
  return {
    [Op.and]: {
      'data.communicationDate': {
        [Op.gte]: dates[0],
      },
    },
  };
}

export function withinCommunicationDate(dates: string[]) {
  const splitDates = dates[0].split('-');
  if (splitDates.length !== 2) {
    return {};
  }
  const startDate = splitDates[0];
  const endDate = splitDates[1];
  return {
    [Op.and]: {
      'data.communicationDate': {
        [Op.between]: [startDate, endDate],
      },
    },
  };
}
