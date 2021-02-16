Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLVTRjis5BxNK_1kMu4OmuPXG14KRJDt2B1bGPm-02sToDn87kxmAAsHvDqdYfbaMd9AMzXwaq3V-V_uySTlFKlYnkZ2brA3-7xnyqz5yOsGzwWguGZN6emNdnHlXBIrXagKX9-yk0FWml-bh9CaZT3A0cyT22JUO56KMdelFdeWyL08yKgqsLuBPHdg5Ze_hy42IORgpPlMlF7WW-zbSF9CojOjQgM1tM-tGGjNZLa33N383KOglGknOWsl1TZ6XEneu0PgXVPofublV_pXEt6p_B2yMLvTB5V2DMkjoaLqz0jLTQcrzFmRrigsWQmCU9R6TPQI8FJ_ZaUMnbKJbgT_IOaLScXvbL8mf5YLwE2K349Ku4jIZXNQ7fqrpZMGKTvdZzHue8nr27BeLu5EN3qVUCe8w_WCKNDNzk-cnPP4I3w73NJXGw7TNQ66rEwd0TvWiYyebdcFrJQ5lKFhuH1-WHNq-Cn1KK_9xoN9tg9JPLPCMYR6PIcBK4EEHb0FQyqX_MNrfPYkY_a2-HMbpkD02C-I6x-BX8HtjEUc_0T2ipAIs6y0-9RbjPP1K6j43TBEwZWksqjjrwqjW_IGuYkHVWMVUSNWXXsPJY1BLlUAjpVWaFZBRRrB_4Dxmx5srAbcaI7PZm6utJgOtgG7nvwM6adBaBTBP_4RAnsiCxgkJptBwpXGZjQYPmWSRQE84FyY6VO61LkDqFd41E7d7Lz73vXIaniNeexUkVCt8ThOzIdFbdcbq_sQKvx0OqDbzoPDRbvPLIfSrr9V8KEYgYZqF-wk9R4gbGjC9tkX0gtkWRQ_Z-xpgkaV0HMKoaYTg34CryisWOQJgosem78uF2PU2lllvV6US8GrIHFY0ow9vFOyMWCXBAa6laRNwAxJAHy2wT5E65p2oBuvNWQJ1fPndf6bHClmcPC1P0qhZkpywT6sa96s1IbTgPEVe5fw_XY5zdxx7xzVdyFcItuGOvRkntUXEE4oFEuuYY6sFnuoueQpP3PHQViNgBLS8qb6-h_uEbQG8MIw_VohPdxRHzyWpss72SJZuna-Y2ZrY3pXsTdZmyvFoIB-mXtZCMhAWBhtxnwEHVTNF3rsKEYXYAhftVhxkGX_HcXCkLY8y7ytvIGKYmxPKYGM3fFt9Pv7IR6Kvv3ai48ZTNak_HjuNE55MueaqnqoHSBtpCdAxvdIpyGdES4YYy4-RHwEXSC-Ry5MZT7_0000" alt="logical data model diagram">

UML Source
----------

```
@startuml
scale 0.75

' avoid problems with angled crows feet
skinparam linetype ortho

class User {
  * id : integer <<generated>>
  hsesUserId : string
  name : string
  phoneNumber : string
  * email : string
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
  * userId: integer(32) REFERENCES public.Users.id
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
User .. NextSteps
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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/nLVTRjis5BxNK_1kMu4OmuPXG14KRJDt2B1bGPm-02sToDn87kxmAAsHvDqdYfbaMd9AMzXwaq3V-V_uySTlFKlYnkZ2brA3-7xnyqz5yOsGzwWguGZN6emNdnHlXBIrXagKX9-yk0FWml-bh9CaZT3A0cyT22JUO56KMdelFdeWyL08yKgqsLuBPHdg5Ze_hy42IORgpPlMlF7WW-zbSF9CojOjQgM1tM-tGGjNZLa33N383KOglGknOWsl1TZ6XEneu0PgXVPofublV_pXEt6p_B2yMLvTB5V2DMkjoaLqz0jLTQcrzFmRrigsWQmCU9R6TPQI8FJ_ZaUMnbKJbgT_IOaLScXvbL8mf5YLwE2K349Ku4jIZXNQ7fqrpZMGKTvdZzHue8nr27BeLu5EN3qVUCe8w_WCKNDNzk-cnPP4I3w73NJXGw7TNQ66rEwd0TvWiYyebdcFrJQ5lKFhuH1-WHNq-Cn1KK_9xoN9tg9JPLPCMYR6PIcBK4EEHb0FQyqX_MNrfPYkY_a2-HMbpkD02C-I6x-BX8HtjEUc_0T2ipAIs6y0-9RbjPP1K6j43TBEwZWksqjjrwqjW_IGuYkHVWMVUSNWXXsPJY1BLlUAjpVWaFZBRRrB_4Dxmx5srAbcaI7PZm6utJgOtgG7nvwM6adBaBTBP_4RAnsiCxgkJptBwpXGZjQYPmWSRQE84FyY6VO61LkDqFd41E7d7Lz73vXIaniNeexUkVCt8ThOzIdFbdcbq_sQKvx0OqDbzoPDRbvPLIfSrr9V8KEYgYZqF-wk9R4gbGjC9tkX0gtkWRQ_Z-xpgkaV0HMKoaYTg34CryisWOQJgosem78uF2PU2lllvV6US8GrIHFY0ow9vFOyMWCXBAa6laRNwAxJAHy2wT5E65p2oBuvNWQJ1fPndf6bHClmcPC1P0qhZkpywT6sa96s1IbTgPEVe5fw_XY5zdxx7xzVdyFcItuGOvRkntUXEE4oFEuuYY6sFnuoueQpP3PHQViNgBLS8qb6-h_uEbQG8MIw_VohPdxRHzyWpss72SJZuna-Y2ZrY3pXsTdZmyvFoIB-mXtZCMhAWBhtxnwEHVTNF3rsKEYXYAhftVhxkGX_HcXCkLY8y7ytvIGKYmxPKYGM3fFt9Pv7IR6Kvv3ai48ZTNak_HjuNE55MueaqnqoHSBtpCdAxvdIpyGdES4YYy4-RHwEXSC-Ry5MZT7_0000)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
