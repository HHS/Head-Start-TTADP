import { GROUP_COLLABORATORS } from '../constants';
import { REPORT_ACCESS_SCOPES } from '../middleware/scopeConstants';

interface Permission {
  regionId: number;
  scopeId: number;
}

interface UserType {
  id: number;
  permissions: Permission[];
}

export interface GrantType {
  id: number;
  regionId: number;
  recipientId?: number;
  status?: string;
}
interface GroupCollaboratorType {
  user: { id: number; name: string };
  collaboratorType: { name: string };
}

interface GroupType {
  id: number;
  name?: string;
  grants?: GrantType[];
  groupCollaborators?: GroupCollaboratorType[];
  isPublic: boolean;
}

export default class Group {
  readonly user: UserType;

  readonly grants: GrantType[];

  readonly group: GroupType;

  constructor(user: UserType, grants?: GrantType[], group?: GroupType) {
    this.user = user;
    this.grants = grants || group?.grants || [];
    this.group = group;
  }

  private userIsCollaboratorForType(types?: string[]) {
    return !!this?.group?.groupCollaborators?.find(
      ({ user: { id: userId }, collaboratorType: { name: collaboratorType } }) =>
        userId === this.user.id && (!types || types.includes(collaboratorType))
    );
  }

  // With scopeIds, only permissions with one of those scopes count toward a grant's region
  private userIsAbleToAccessGrants(scopeIds?: number[]) {
    return this.grants.every((grant) =>
      this.user.permissions.some(
        (permission) =>
          permission.regionId === grant.regionId &&
          (!scopeIds || scopeIds.includes(permission.scopeId))
      )
    );
  }

  // Requires the same report scopes as the grant picker (potentialRecipientGrants), so a user
  // cannot add a grant the picker would never offer them
  canAddToGroup() {
    return this.userIsAbleToAccessGrants(REPORT_ACCESS_SCOPES);
  }

  canEditGroup() {
    return this.userIsCollaboratorForType([
      GROUP_COLLABORATORS.CREATOR,
      GROUP_COLLABORATORS.CO_OWNER,
    ]);
  }

  ownsGroup() {
    return this.userIsCollaboratorForType([
      GROUP_COLLABORATORS.CREATOR,
      GROUP_COLLABORATORS.CO_OWNER, // TODO: Check if co-owner can delete group.
    ]);
  }

  isPublic() {
    return this.group.isPublic && this.userIsAbleToAccessGrants();
  }

  canUseGroup() {
    return this.userIsCollaboratorForType() || this.isPublic();
  }
}
