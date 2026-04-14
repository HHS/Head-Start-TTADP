/* istanbul ignore file */
import type { WhereOptions } from 'sequelize';

export interface IScopes {
  trainingReport?: WhereOptions[];
  activityReport?: WhereOptions[];
  goal?: WhereOptions[];
  grant?: {
    where: WhereOptions;
  };
  deliveredReview?: WhereOptions[];
  citation?: WhereOptions[];
}
