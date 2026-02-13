import { Op } from 'sequelize'

export function activeBefore(dates) {
  const scopes = dates.reduce(
    (acc, date) => [
      ...acc,
      {
        startDate: {
          [Op.lte]: new Date(date),
        },
      },
    ],
    []
  )

  return {
    where: {
      [Op.or]: scopes,
    },
  }
}

export function activeAfter(dates) {
  const scopes = dates.reduce(
    (acc, date) => [
      ...acc,
      {
        endDate: {
          [Op.gte]: new Date(date),
        },
        [Op.or]: [
          {
            inactivationDate: { [Op.gte]: new Date(date) },
          },
          {
            inactivationDate: null,
          },
        ],
      },
    ],
    []
  )

  return {
    where: {
      [Op.or]: scopes,
    },
  }
}

export function activeWithinDates(dates) {
  const scopes = dates.reduce((acc, range) => {
    if (!range.split) {
      return acc
    }

    const [sd, ed] = range.split('-')
    if (!sd || !ed) {
      return acc
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
        [Op.or]: [{ inactivationDate: { [Op.gte]: new Date(sd) } }, { inactivationDate: null }],
      },
    ]
  }, [])

  return {
    where: {
      [Op.or]: scopes,
    },
  }
}
