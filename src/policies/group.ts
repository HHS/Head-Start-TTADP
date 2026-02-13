import { GROUP_COLLABORATORS } from '../constants'

interface Permission {
  regionId: number
  scopeId: number
}

interface UserType {
  id: number
  permissions: Permission[]
}

interface GrantType {
  id: number
  regionId: number
  recipientId?: number
  status?: string
}
interface GroupCollaboratorType {
  user: { id: number; name: string }
  collaboratorType: { name: string }
}

interface GroupType {
  id: number
  name?: string
  grants?: GrantType[]
  groupCollaborators?: GroupCollaboratorType[]
  isPublic: boolean
}

export default class Group {
  readonly user: UserType

  readonly grants: GrantType[]

  readonly group: GroupType

  constructor(user: UserType, grants?: GrantType[], group?: GroupType) {
    this.user = user
    this.grants = grants || group?.grants || []
    this.group = group
  }

  private userIsCollaboratorForType(types?: string[]) {
    return !!this?.group?.groupCollaborators?.find(
      ({ user: { id: userId }, collaboratorType: { name: collaboratorType } }) =>
        userId === this.user.id && (!types || types.includes(collaboratorType))
    )
  }

  private userIsAbleToAccessGrants() {
    return this.grants.every((grant) => this.user.permissions.some((permission) => permission.regionId === grant.regionId))
  }

  canAddToGroup() {
    return this.userIsAbleToAccessGrants()
  }

  canEditGroup() {
    return this.userIsCollaboratorForType([GROUP_COLLABORATORS.CREATOR, GROUP_COLLABORATORS.CO_OWNER])
  }

  ownsGroup() {
    return this.userIsCollaboratorForType([
      GROUP_COLLABORATORS.CREATOR,
      GROUP_COLLABORATORS.CO_OWNER, // TODO: Check if co-owner can delete group.
    ])
  }

  isPublic() {
    return this.group.isPublic && this.userIsAbleToAccessGrants()
  }

  canUseGroup() {
    return this.userIsCollaboratorForType() || this.isPublic()
  }
}
