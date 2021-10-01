import { Op } from 'sequelize';
import filtersToScopes from '../index';
import db, {
  ActivityReport, ActivityRecipient, User, Grantee, Grant, ActivityReportCollaborator, NonGrantee,
} from '../../models';
import { REPORT_STATUSES } from '../../constants';

describe('granteeFiltersToScopes', () => {
  beforeAll(() => {

  });

  afterAll(() => {
    db.sequelize.close();
  });
});
