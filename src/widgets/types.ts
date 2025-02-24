import { WhereOptions } from 'sequelize';

export interface IScopes {
  grant: WhereOptions[],
  trainingReport: WhereOptions[],
}
