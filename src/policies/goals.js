import { find, isUndefined } from 'lodash';
import SCOPES from '../middleware/scopeConstants';

export default class Goal {
  constructor(user, goal, regionId) {
    this.user = user;
    this.goal = goal;
    this.regionId = regionId;
  }

  // this expects goal to have been found with associated data, specifically
  // goalByIdWithActivityReportsAndRegions in services/goals
  // you can see the structure expected in the conditions below
  canDelete() {
    if (this.isOnApprovedActivityReports()) {
      return false;
    }

    const regions = this.goal.grants.map((grant) => grant.regionId);
    return regions.every((region) => this.canWriteInRegion(region));
  }

  canCreate() {
    return this.canWriteInRegion(this.regionId);
  }

  canEdit() {
    return this.canDelete();
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
    return !isUndefined(permissions);
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
  isOnApprovedActivityReports() {
    return this.goal.objectives
      && this.goal.objectives.length
      && this.goal.objectives[0].activityReports
      && this.goal.objectives[0].activityReports.length;
  }

  canView() {
    const regions = this.goal.grants.map((grant) => grant.regionId);
    return regions.some((region) => this.canReadInRegion(region));
  }
}
