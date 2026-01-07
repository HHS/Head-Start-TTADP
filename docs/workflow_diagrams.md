Workflow Diagrams
=================

Collection of various workflows and processes present in the TTA Smart Hub application.

Account Creation
----------------

```mermaid
flowchart TD
  Start([Start])
  Login[User logs in via HSES]
  HasHses{User has HSES account?}
  Redirect[User is redirected to TTAHUB with access token]
  UserLocked{User is locked?}
  RequestUnlock[User must send request to TTAHUB operators to unlock account]
  HasPermissions{User has TTAHUB permissions set?}
  AllowLogin[User may log in and view records their permissions allow]
  AccountExists{User account exists?}
  AutoCreate[User account is automatically created]
  RequestPermissions[User must send request to TTAHUB operators to have permissions set]
  RequestHses[User must request account creation within HSES]
  Stop([Stop])
  End([End])

  Start --> Login --> HasHses
  HasHses -- No --> RequestHses --> Stop
  HasHses -- Yes --> Redirect --> UserLocked
  UserLocked -- Yes --> RequestUnlock --> Stop
  UserLocked -- No --> HasPermissions
  HasPermissions -- Yes --> AllowLogin --> End
  HasPermissions -- No --> AccountExists
  AccountExists -- No --> AutoCreate --> RequestPermissions --> Stop
  AccountExists -- Yes --> RequestPermissions --> Stop
```

Account Termination
-------------------

```mermaid
flowchart TD
  Start([Start])
  Review[Review user account]
  Over180{User last logged in more than 180 days ago?}
  RemovePermissions[Remove all permissions from User account]
  Over60{User last logged in more than 60 days ago?}
  LockAccount[Lock User account]
  MoreAccounts{More accounts to review?}
  End([End])

  Start --> Review --> Over180
  Over180 -- Yes --> RemovePermissions --> MoreAccounts
  Over180 -- No --> Over60
  Over60 -- Yes --> LockAccount --> MoreAccounts
  Over60 -- No --> MoreAccounts
  MoreAccounts -- Yes --> Review
  MoreAccounts -- No --> End
```

Setting Permissions
-------------------

```mermaid
flowchart TD
  Start([Start])
  ReviewRequest[Account manager reviews user permission request]
  Contractor{User is a TTA Contractor?}
  SetRoster[Set user permissions according to user's role on regional Staffing Roster]
  SetOffice[Set user permissions according to central or regional office role]
  Unlock[Unlock user]
  End([End])

  Start --> ReviewRequest --> Contractor
  Contractor -- Yes --> SetRoster --> Unlock --> End
  Contractor -- No --> SetOffice --> Unlock --> End
```
