import filterArray from './utils';

export function withTargetPopulations(targetPopulations) {
  return filterArray('ARRAY_TO_STRING("ActivityReport"."targetPopulations", \',\')', targetPopulations, false);
}

export function withoutTargetPopulations(targetPopulations) {
  return filterArray('ARRAY_TO_STRING("ActivityReport"."targetPopulations", \',\')', targetPopulations, true);
}

// import { Op } from 'sequelize';
// import { TARGET_POPULATIONS } from '../../constants';

// export function allowedPopulations(populations) {
//   function filterPopulations(population) {
//     return TARGET_POPULATIONS.includes(population);
//   }

//   if (!Array.isArray(populations)) {
//     return [populations].filter((population) => filterPopulations(population));
//   }

//   return populations.filter((population) => filterPopulations(population));
// }

// export function withTargetPopulations(populations) {
//   const allowed = allowedPopulations(populations);

//   // if we don't have any allowed populations, don't apply a filter at all
//   if (allowed.length < 1) {
//     return {};
//   }

//   return {
//     targetPopulations: {
//       [Op.overlap]: allowed,
//     },
//   };
// }

// export function withoutTargetPopulations(populations) {
//   return {
//     [Op.not]: withTargetPopulations(populations),
//   };
// }
