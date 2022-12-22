import { Op } from 'sequelize';
import {
  ActivityReport,
  sequelize,
} from '../models';
import { REPORT_STATUSES } from '../constants';

export async function countOccurrences(scopes, column, possibilities) {
  const allOccurrences = await ActivityReport.findAll({
    attributes: [
      [sequelize.fn('unnest', sequelize.col(column)), column],
    ],
    where: {
      [Op.and]: [scopes],
      calculatedStatus: REPORT_STATUSES.APPROVED,
    },
    nest: true,
    raw: true,
  });

  const result = possibilities.reduce((prev, current) => ({
    ...prev,
    [current]: 0,
  }), {});

  allOccurrences.forEach((row) => {
    const occurrence = row[column];
    if (occurrence in result) {
      result[occurrence] += 1;
    } else {
      result[occurrence] = 1;
    }
  });

  return Object.entries(result).map(([key, value]) => ({
    category: key,
    count: value,
  }));
}

export function countBySingleKey(data, key, results) {
  // Get counts for each key.
  data.forEach((point) => {
    point[key].forEach((r) => {
      const obj = results.find((e) => e.name === r);
      if (obj) {
        obj.count += 1;
      } else {
        results.push({ name: r, count: 1 });
      }
    });
  });

  // Sort By Count largest to smallest.
  results.sort((r1, r2) => {
    if (r2.count - r1.count === 0) {
      // Break tie on name
      const name1 = r1.name.toUpperCase().replace(' ', ''); // ignore upper and lowercase
      const name2 = r2.name.toUpperCase().replace(' ', ''); // ignore upper and lowercase
      if (name1 < name2) {
        return -1;
      }
      if (name1 > name2) {
        return 1;
      }
    }
    return r2.count - r1.count;
  });

  return results;
}

export function formatNumber(numberToFormat, decimalPlaces = 0) {
  if (!numberToFormat || Number.isNaN(parseFloat(numberToFormat))) {
    return '0';
  }

  return parseFloat(numberToFormat).toLocaleString(
    'en-US',
    { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces },
  );
}
