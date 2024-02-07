export default class Grant {
  constructor(grant) {
    this.grant = grant;
  }

  canAssignRegionAndRecipient() {
    return this.grant.cdi;
  }
}
