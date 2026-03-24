/* istanbul ignore file */
import type { WhereOptions } from 'sequelize';

export interface IScopes {
  grant?: WhereOptions[];
  trainingReport?: WhereOptions[];
  activityReport?: WhereOptions[];
  goal?: WhereOptions[];
}
