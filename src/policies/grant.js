export default class Grant {
  constructor(grant) {
    this.grant = grant;
  }

  canAssignRegionAndGrantee() {
    return this.grant.cdi;
  }
}
