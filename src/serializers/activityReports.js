import yayson from 'yayson';

const { Presenter } = yayson({ adapter: 'sequelize' });

class ActivityReportsPresenter extends Presenter {}
ActivityReportsPresenter.prototype.type = 'activityReports';
ActivityReportsPresenter.prototype.attributes = function attributes(instance) {
  // eslint-disable-next-line prefer-rest-params
  const attrs = Presenter.prototype.attributes.apply(this, arguments);
  return {
    author: {
      id: attrs.author.id.toString(),
      name: attrs.author.fullName,
    },
    collaborators: attrs.collaborators.map((collab) => ({
      id: collab.id.toString(),
      name: collab.fullName,
    })),
    displayId: attrs.displayId,
    duration: parseFloat(attrs.duration),
    endDate: instance.getDataValue('endDate'),
    reason: attrs.reason,
    region: attrs.regionId,
    reportCreationDate: attrs.createdAt,
    reportLastUpdated: attrs.updatedAt,
    startDate: instance.getDataValue('startDate'),
    topics: attrs.topics,
  };
};
ActivityReportsPresenter.prototype.selfLinks = function selfLinks(instance) {
  return {
    self: `${process.env.TTA_SMART_HUB_URI}/api/v1/activity-reports/display/${instance.get('displayId')}`,
    html: `${process.env.TTA_SMART_HUB_URI}/activity-reports/view/${instance.id}`,
  };
};

export default ActivityReportsPresenter;
