import { GROUP_COLLABORATORS } from '../constants';

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
  recipientId?: number;
  status?: string;
}
interface GroupCollaboratorType {
  user: { id: number, name: string },
  collaboratorType: { name: string },
}

interface GroupType {
  id: number;
  isPublic: boolean;
  grants?: GrantType[]
  groupCollaborators?: GroupCollaboratorType[],
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

  canEditGroup() {
    return !!this.group.groupCollaborators
      .find(({
        user: { id: userId },
        collaboratorType: { name: collaboratorType },
      }) => userId === this.user.id
      && (collaboratorType === GROUP_COLLABORATORS.CREATOR
        || collaboratorType === GROUP_COLLABORATORS.CO_OWNER));
  }

  ownsGroup() {
    return !!this.group.groupCollaborators
      .find(({
        user: { id: userId },
        collaboratorType: { name: collaboratorType },
      }) => userId === this.user.id
      && collaboratorType === GROUP_COLLABORATORS.CREATOR);
  }

  isPublic() {
    return this.group.isPublic && this.grants.every((grant) => (
      this.user.permissions.some((permission) => (
        permission.regionId === grant.regionId
      ))));
  }

  canUseGroup() {
    return !!this?.group?.groupCollaborators
      ?.find(({ user: { id: userId } }) => userId === this.user.id)
      || this.isPublic();
  }
}
