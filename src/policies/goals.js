import { find, isUndefined } from 'lodash';
import { REPORT_STATUSES } from '@ttahub/common';
import SCOPES from '../middleware/scopeConstants';

export default class Goal {
  constructor(user, goal, regionId) {
    this.user = user;
    this.goal = goal;
    this.regionId = regionId;
  }

  isAdmin() {
    return !isUndefined(
      this.user.permissions.find((permission) => permission.scopeId === SCOPES.ADMIN),
    );
  }

  // this expects goal to have been found with associated data, specifically
  // goalByIdWithActivityReportsAndRegions in services/goals
  // you can see the structure expected in the conditions below
  canDelete() {
    if (this.isOnApprovedActivityReports()) {
      return false;
    }

    return this.canWriteInRegion(this.goal.grant.regionId);
  }

  canCreate() {
    return this.canWriteInRegion(this.regionId);
  }

  canEdit() {
    return this.canDelete();
  }

  canWriteInRegions() {
    const regions = this.goal.grant.map((grant) => grant.regionId);
    return regions.every((region) => this.canWriteInRegion(region));
  }

  // refactored to take a region id rather than directly check
  // the instance props so we can use it in the reduce and in other situations
  canWriteInRegion(region) {
    // a goal can have multiple regions
    const permissions = find(
      this.user.permissions,
      (permission) => (
        (
          permission.scopeId === SCOPES.READ_WRITE_REPORTS
          || permission.scopeId === SCOPES.APPROVE_REPORTS
        )
        && permission.regionId === region),
    );

    // eslint-disable-next-line max-len
    const isAdmin = find(this.user.permissions, (permission) => permission.scopeId === SCOPES.ADMIN);

    return !isUndefined(isAdmin) || !isUndefined(permissions);
  }

  // refactored to take a region id rather than directly check
  // the instance props so we can use it in the reduce and in other situations
  canReadInRegion(region) {
    // a goal can have multiple regions
    const permissions = find(
      this.user.permissions,
      (permission) => (
        (
          permission.scopeId === SCOPES.READ_WRITE_REPORTS
          || permission.scopeId === SCOPES.APPROVE_REPORTS
          || permission.scopeId === SCOPES.READ_REPORTS
        )
        && permission.regionId === region),
    );
    return !isUndefined(permissions);
  }

  // this expects goal to have been found with associated data, specifically
  // goalByIdWithActivityReportsAndRegions in services/goals
  // you can see the structure expected in the conditions below
  //
  // TODO - it's been noted that this would be a great candidate for a virtual field
  // note about above todo - is that possible?
  isOnApprovedActivityReports() {
    return this.goal.objectives
      && this.goal.objectives.length
      && this.goal.objectives.some((objective) => (
        objective.activityReports
        && objective.activityReports.length
        && objective.activityReports.some(
          (report) => report.calculatedStatus === REPORT_STATUSES.APPROVED,
        )
      ));
  }

  isOnActivityReports() {
    return this.goal.objectives
      && this.goal.objectives.length
      && this.goal.objectives.some((objective) => (
        objective.activityReports && objective.activityReports.length
      ));
  }

  canChangeStatus() {
    return this.canWriteInRegion(this.goal.grant.regionId);
  }

  canView() {
    if (!this.goal || !this.goal.grant) {
      return false;
    }
    const region = this.goal.grant.regionId;

    return this.canReadInRegion(region);
  }
}
