Logical Data Model
==================

![logical data model diagram](http://www.plantuml.com/plantuml/png/nLTjRzis4FwkNy5lUm5Y31k60KLGDCtS8S2M1N7w0yxIHUP6yRZZAQsHvBzFD1FPjEI4jR3rIm8zz_xmZaU_ym8iRMCANu91zSFibv-BuXi5TwGhvPYM1XklFcbPAR2rmKgLJ9-ykaMKml-jhGE6HXbjKTOE5R6ig2XA0zwhZnvPtHTAVQywRs-Kje9r1vsUrcYHGR1w-tOZNddqGViYg7bXRUi4jz3WhYJWPsqNYhLez9q8c65z6XM2ptqBjoABbsspHDw5iG5jTW7HOl2DGjis8GurU8sr9dknKy2tF_tudRgUVvXVpo_FvmlbsgNHvImg-fckDhaRyF8xrTfsXg8Rz0ADsqXAnb3xcGmahQj698_FXCO8UPIc1FGk5YKvFCQ3KXNwahKJJRP79vLpXTnexxDBQZronZc4XkbFWOyyFHzuoZ3Ry1ciffxiFss7pPc9VGuRvCA79hjxGYthtSy6PKN9H74CyvwgTGfxHzRZ8VoSAkpnYOMI6Mk_brhsXfmkispICD4kgxEOJCvX1w_zMKjmVr6zPhF9Odg3_4PWyZXGoWj8wtUHuF2MzzIq_y3KB1fWyIj4kH6uCX0QQaba4EoaZEEnlPHstSaoI0yklXBfb_XP5e9kEv5f1L2AljEolaP7BA-dTPReFwTdIJ0PhW3Sh1sEJzp16iRxXi4APexS5B9Yf8Dn1flts8kvZWNbD4xK38Q3cOW8owyWk5Sescg8JYOcT776NNHCWIarkNR1wjWnd31HP6FMnxn1feLEXoydFAEdbilD4pHPer1LEknUC9Sac7HLRFG_Rw-0HPVQ1QQJMQZGw3lazH-3vLor_KQliDGDcAGRGt5zsoOGz9Lr0JLQ2PV7oDf7JgaSpeHZgXcQO3_sg1RW6kMAN6iscOxfC88dEo9m2IFxudYpZme4OZq3IKbMyBCa1K2D2udi_EN9Tb03jWCvFQcZtvC6l7oCZVP-_Hy_Hf_CfhVyjXcp-dwusDGHc-tBhgDeOllh8SDkUvTC9YfD_voCWIKn2F7_oDSNDMGm6Ky_VzLCJVk83VAKTgX0FJoSqBsAhHwHHpevURZV-LrOn9-hGpnQZGd8FEl75sYn-QiU7pPGoA68NTEhzVkv27y6Q7GvcwdmVyVbE1I3RhsbI0mSAkz3F9MIOYdFmSdX3etKlQmozDS_RL-DbTHoI1JftHCdvxmdIZyJdUI-Yfm5-RXuUmaSrdc7jceRyoy0)

UML Source
----------

```
@startuml
scale 0.75

' avoid problems with angled crows feet
skinparam linetype ortho

class User {
  * id : integer <<generated>>
  * hsesUserId : string
  * hsesUsername : string
  hsesAuthorities : array<string>
  name : string
  phoneNumber : string
  email : string
  title: enum
  homeRegionId : integer(32) REFERENCES public.Regions.id
  * lastLogin : timestamp
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Region {
  * id : integer <<generated>>
  * name : string
}

class Scope {
  * id : integer <<generated>>
  * name : string
  description: string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Permission {
  * id : integer <<generated>>
  * userId : integer(32) REFERENCES public.Users.id
  * regionId : integer(32) REFERENCES public.Regions.id
  * scopeId : integer(32) REFERENCES public.Scopes.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class RequestErrors {
  * id : integer <<generated>>
  operation : string
  uri : string
  method : string
  requestBody : string
  responseBody : string
  responseCode : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Role {
  * id : integer
  * name : string
}

class Topic {
  * id : integer
  * name : string
}

class RoleTopic {
  * id : integer <<generated>>
  * roleId : integer(32) REFERENCES public.Roles.id
  * topicId: integer(32) REFERENCES public.Topics.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Goal {
  * id : integer
  * name : string
  status : string
  timeframe : string
  isFromSmartsheetTtaPlan : boolean
  * createdAt : timestamp
  * updatedAt : timestamp
}

class TopicGoal {
  * id : integer
  * goalId : integer(32) REFERENCES public.Goals.id
  * topicId: integer(32) REFERENCES public.Topics.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class NextSteps {
  * id: integer
  * activityReportId: integer(32) REFERENCES public.ActivityReport.id
  * note: string
  * noteType: string
  * createdAt: timestamp
  * updatedAt: timestamp
}

class Grantee {
  * id : integer
  * name : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Grant {
  * id : integer
  * number : string
  regionId : integer(32) REFERENCES public.Regions.id
  * granteeId : integer(32) REFERENCES public.Grantee.id
  status : string
  startDate : timestamp
  endDate : timestamp
  * createdAt : timestamp
  * updatedAt : timestamp
}

class GrantGoal {
  * id : integer <<generated>>
  * granteeId : integer(32) REFERENCES public.Grantees.id
  * grantId : integer(32) REFERENCES public.Grants.id
  * goalId : integer(32) REFERENCES public.Goals.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class NonGrantee {
  * id : integer <<generated>>
  * name : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityReport {
  * id : integer <<generated>>
  resourcesUsed : string
  additionalNotes : string
  numberOfParticipants : integer
  deliveryMethod : string
  duration : decimal
  endDate : date
  startDate : date
  activityRecipientType : string
  requester : string
  * status : string
  programTypes : array<string>
  targetPopulations : array<string>
  reason : array<string>
  participants : array<string>
  topics : array<string>
  ttaType : array<string>
  context : string
  pageState : json
  managerNotes : string
  * userId : integer(32) REFERENCES public.Users.id
  * lastUpdatedById : integer(32) REFERENCES public.Users.id
  * regionId : integer(32) REFERENCES public.Region.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityParticipant {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  grantId : integer(32) REFERENCES public.Grant.id
  nonGranteeId : integer(32) REFERENCES public.NonGrantee.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityReportCollaborator {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * userId : integer(32) REFERENCES public.User.id
}

class ActivityReportGoal {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * goalId : integer(32) REFERENCES public.Goal.id
}

User ||-o{ Region
User }o--|{ Permission
Scope }o--|{ Permission
Region }o--|{ Permission
Role }o--|{ Topic
Topic }|--|{ Goal
Grantee }o--|{ GrantGoal
Goal }o--|{ GrantGoal
Role .. RoleTopic
Topic .. RoleTopic
Topic .. TopicGoal
Goal .. TopicGoal
Grantee ||--|{ Grant
Region ||--|{ Grant
ActivityReport .. ActivityReportCollaborator
User .. ActivityReportCollaborator
ActivityReport .. NextSteps
ActivityReport .. ActivityReportGoal
Goal .. ActivityReportGoal
Goal }|--|{ ActivityReport

User ||-o{ ActivityReport
ActivityReport ||-o{ ActivityParticipant
Grant ||-{ ActivityParticipant
NonGrantee ||-{ ActivityParticipant
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/nLTjRzis4FwkNy5lUm5Y31k60KLGDCtS8S2M1N7w0yxIHUP6yRZZAQsHvBzFD1FPjEI4jR3rIm8zz_xmZaU_ym8iRMCANu91zSFibv-BuXi5TwGhvPYM1XklFcbPAR2rmKgLJ9-ykaMKml-jhGE6HXbjKTOE5R6ig2XA0zwhZnvPtHTAVQywRs-Kje9r1vsUrcYHGR1w-tOZNddqGViYg7bXRUi4jz3WhYJWPsqNYhLez9q8c65z6XM2ptqBjoABbsspHDw5iG5jTW7HOl2DGjis8GurU8sr9dknKy2tF_tudRgUVvXVpo_FvmlbsgNHvImg-fckDhaRyF8xrTfsXg8Rz0ADsqXAnb3xcGmahQj698_FXCO8UPIc1FGk5YKvFCQ3KXNwahKJJRP79vLpXTnexxDBQZronZc4XkbFWOyyFHzuoZ3Ry1ciffxiFss7pPc9VGuRvCA79hjxGYthtSy6PKN9H74CyvwgTGfxHzRZ8VoSAkpnYOMI6Mk_brhsXfmkispICD4kgxEOJCvX1w_zMKjmVr6zPhF9Odg3_4PWyZXGoWj8wtUHuF2MzzIq_y3KB1fWyIj4kH6uCX0QQaba4EoaZEEnlPHstSaoI0yklXBfb_XP5e9kEv5f1L2AljEolaP7BA-dTPReFwTdIJ0PhW3Sh1sEJzp16iRxXi4APexS5B9Yf8Dn1flts8kvZWNbD4xK38Q3cOW8owyWk5Sescg8JYOcT776NNHCWIarkNR1wjWnd31HP6FMnxn1feLEXoydFAEdbilD4pHPer1LEknUC9Sac7HLRFG_Rw-0HPVQ1QQJMQZGw3lazH-3vLor_KQliDGDcAGRGt5zsoOGz9Lr0JLQ2PV7oDf7JgaSpeHZgXcQO3_sg1RW6kMAN6iscOxfC88dEo9m2IFxudYpZme4OZq3IKbMyBCa1K2D2udi_EN9Tb03jWCvFQcZtvC6l7oCZVP-_Hy_Hf_CfhVyjXcp-dwusDGHc-tBhgDeOllh8SDkUvTC9YfD_voCWIKn2F7_oDSNDMGm6Ky_VzLCJVk83VAKTgX0FJoSqBsAhHwHHpevURZV-LrOn9-hGpnQZGd8FEl75sYn-QiU7pPGoA68NTEhzVkv27y6Q7GvcwdmVyVbE1I3RhsbI0mSAkz3F9MIOYdFmSdX3etKlQmozDS_RL-DbTHoI1JftHCdvxmdIZyJdUI-Yfm5-RXuUmaSrdc7jceRyoy0)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
