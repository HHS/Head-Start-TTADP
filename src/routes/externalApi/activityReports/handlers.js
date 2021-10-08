import ActivityReport from '../../../policies/activityReport';
import ActivityReportsPresenter from '../../../serializers/activityReports';
import { notFound, unauthorized } from '../../../serializers/errorResponses';
import { userById } from '../../../services/users';
import { activityReportById } from '../../../services/activityReports';
import handleErrors from '../../../lib/apiErrorHandler';
import { currentUserId } from '../../../services/currentUser';

const logContext = {
  namespace: 'API:ACTIVITY_REPORTS',
};

// eslint-disable-next-line import/prefer-default-export
export async function getReportByDisplayId(req, res) {
  try {
    const { displayId } = req.params;
    const id = displayId.replace(/^R\d{2}-AR-/, '');
    const report = await activityReportById(id);
    if (!report) {
      notFound(res, `Report ${displayId} could not be found`);
      return;
    }
    const user = await userById(currentUserId(req, res));
    const authorization = new ActivityReport(user, report);

    if (!authorization.canGet()) {
      unauthorized(res, `User is not authorized to access ${displayId}`);
      return;
    }
    res.json(ActivityReportsPresenter.render(report));
  } catch (error) {
    handleErrors(req, res, error, logContext);
  }
}
