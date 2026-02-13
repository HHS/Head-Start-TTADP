import SCOPES from '../middleware/scopeConstants'

export default class SessionReport {
  constructor(user, sessionReport) {
    this.user = user
    this.sessionReport = sessionReport
    this.permissions = user.permissions || []
  }

  canCreate() {
    return this.canWriteInRegion()
  }

  canRead() {
    return this.canReadInRegion()
  }

  canReadInRegion() {
    if (this.isAdmin()) {
      return true
    }

    return !!this.permissions.find(
      (p) => [SCOPES.READ_REPORTS, SCOPES.READ_WRITE_TRAINING_REPORTS].includes(p.scopeId) && p.regionId === this.sessionReport.regionId
    )
  }

  /**
   * Determines if the user has write access to the specified region
   * or to the region of their current session report.
   *
   * @param {string|null} regionId - The ID of the region to check access for.
   * If null, checks the region of the given session report.
   *
   * @returns {boolean} - Returns true if the user has write access to the region,
   * otherwise returns false.
   *
   * @throws {Error} When the regionId is not provided and there is no session report available.
   */
  canWriteInRegion(regionId = null) {
    if (this.isAdmin()) {
      return true
    }

    if (regionId == null) {
      return !!this.permissions.find((p) => [SCOPES.READ_WRITE_TRAINING_REPORTS].includes(p.scopeId) && p.regionId === this.sessionReport.regionId)
    }

    return !!this.permissions.find((p) => [SCOPES.READ_WRITE_TRAINING_REPORTS].includes(p.scopeId) && p.regionId === regionId)
  }

  canDelete() {
    return this.isAdmin() || this.isAuthor()
  }

  canUpdate() {
    if (this.isAdmin()) {
      return true
    }
    if (this.isAuthor()) {
      return true
    }
    return false
  }

  isAdmin() {
    return !!this.permissions.find((p) => p.scopeId === SCOPES.ADMIN)
  }

  isAuthor() {
    return this.user.id === this.sessionReport.ownerId
  }
}
