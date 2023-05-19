import SCOPES from '../middleware/scopeConstants';

interface Permission {
  regionId: number;
  scopeId: number;
}

interface UserType {
  id: number;
  permissions: Permission[];
}

interface GrantType {
  id: number;
  regionId: number;
}

interface GroupType {
  id: number;
  userId: number;
  isPublic: boolean;
}

export default class Group {
  readonly user: UserType;

  readonly grants: GrantType[];

  readonly group: GroupType;

  constructor(user: UserType, grants?: GrantType[], group?: GroupType) {
    this.user = user;
    this.grants = grants || [];
    this.group = group;
  }

  canAddToGroup() {
    return this.grants.every((grant) => (
      this.user.permissions.some((permission) => (
        permission.regionId === grant.regionId
      ))));
  }

  ownsGroup() {
    return this.user.id === this.group.userId;
  }

  isPublic() {
    return this.group.isPublic && this.canAddToGroup();
  }
}
