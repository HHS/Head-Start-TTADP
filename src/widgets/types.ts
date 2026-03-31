/* istanbul ignore file */
import { WhereOptions } from 'sequelize';

export interface IScopes {
  grant?: {
    where: WhereOptions[]
  },
  trainingReport?: WhereOptions[],
  activityReport?: WhereOptions[],
  goal?: WhereOptions[],
  deliveredReview?: WhereOptions[],
  citation: WhereOptions[],
}
