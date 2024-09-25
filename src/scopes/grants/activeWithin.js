import { Op } from 'sequelize';
import { GrantReplacement } from '../../models';

export function activeBefore(dates) {
  const scopes = dates.reduce((acc, date) => [
    ...acc,
    {
      startDate: {
        [Op.lte]: new Date(date),
      },
    },
  ], []);

  return {
    where: {
      [Op.or]: scopes,
    },
    include: [],
  };
}

export function activeAfter(dates) {
  const scopes = dates.reduce((acc, date) => [
    ...acc,
    {
      endDate: {
        [Op.gte]: new Date(date),
      },
      [Op.or]: [{
        '$replacedGrantReplacements.replacementDate$': {
          [Op.gte]: new Date(date),
        },
      }, {
        '$replacedGrantReplacements.replacementDate$': null,
      }, {
        '$replacingGrantReplacements.replacementDate$': {
          [Op.gte]: new Date(date),
        },
      }, {
        '$replacingGrantReplacements.replacementDate$': null,
      }],
    },
  ], []);

  return {
    where: {
      [Op.or]: scopes,
    },
    include: [{
      model: GrantReplacement,
      as: 'replacedGrantReplacements',
      attributes: [],
    }, {
      model: GrantReplacement,
      as: 'replacingGrantReplacements',
      attributes: [],
    }],
  };
}

export function activeWithinDates(dates) {
  const scopes = dates.reduce((acc, range) => {
    if (!range.split) {
      return acc;
    }

    const [sd, ed] = range.split('-');
    if (!sd || !ed) {
      return acc;
    }

    return [
      ...acc,
      {
        startDate: {
          [Op.lte]: new Date(ed),
        },
        endDate: {
          [Op.gte]: new Date(sd),
        },
        [Op.or]: [{
          '$replacedGrantReplacements.replacementDate$': {
            [Op.gte]: new Date(sd),
          },
        }, {
          '$replacedGrantReplacements.replacementDate$': null,
        }, {
          '$replacingGrantReplacements.replacementDate$': {
            [Op.gte]: new Date(sd),
          },
        }, {
          '$replacingGrantReplacements.replacementDate$': null,
        }],
      },
    ];
  }, []);

  return {
    where: {
      [Op.or]: scopes,
    },
    include: [{
      model: GrantReplacement,
      as: 'replacedGrantReplacements',
      attributes: [],
    }, {
      model: GrantReplacement,
      as: 'replacingGrantReplacements',
      attributes: [],
    }],
  };
}
