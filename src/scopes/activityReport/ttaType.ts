import { Op, WhereOptions } from 'sequelize';
import filterArray from './utils';
import { sequelize } from '../../models';

function calculateValues(options: ['tta' | 'training' | 'both'], include = true) : string[] {
  const query = [];

  if (options.includes('tta')) {
    query.push('Technical Assistance', 'technical-assistance');
  }

  if (options.includes('training')) {
    query.push('training');
  }

  if (options.includes('both')) {
    query.push('Both', 'training', 'technical-assistance', 'Technical Assistance');
  }

  return query;
}

export function withTtaType(query: ['tta' | 'training' | 'both']): WhereOptions {
  const ttaTypes = calculateValues(query);
  return filterArray('ARRAY_TO_STRING("ttaType", \',\')', ttaTypes, false);
}

export function withoutTtaType(query: ['tta' | 'training' | 'both']): WhereOptions {
  const ttaTypes = calculateValues(query, false);
  return filterArray('ARRAY_TO_STRING("ttaType", \',\')', ttaTypes, true);
}
