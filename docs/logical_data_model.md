Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/pLXVRzis47_Nf-3R_c09XWtRGn4KJLEt2DOcGPn-05gyoEmeddOyfJMIVFU5FfWH8pbHR2_hYmtzxl-V8qzw4rWJjxKhGgaTg5_t__oZA7vG-WgjKGtXp44Tr5VBSwLzvS2eal1hK9S0N8I_hMyqwLevwu4N3IWadcDHb4w7e3u787LTAFMpiaQzKjOpL43guA023wGPpElNI_8yG8ZSnv4jC5bVPRZNDNGf4JziUOvasKAu8saYlJWGXgZpeKGpHmydRJq3wi9GQ-kw05jsy4g1R-je1siuXygYF-u4yEFll_sapYVl9-UJawF9L3NjpDboNnZ3lZLBtvqE_14hw-y4sTOGMDVDab8InDWFkKTf6pD0kLqbL2oCIscUWAHYMc83csXGoa0eoJPiqITqgt3EW6eRmkYGsW0qeWwnOL8LQCFgXPYd4MBBV8hKTfNzfuN04oAaC2ORsCG7YxvRePPizx46dcCsKIHctg9Pv71eq0TOXn-XWOHl6IYweVPxh6KliB7bU9baHkH6THQX6rFig3NLcgFwO_EKpDABxHla0setBWTA1TRSXYuI5LxI0pORtXFMqreJXpa0Nx0-Spesr0pHWVPRUInbUypj2hKRaVIeudzA-Wbyuob3Sp-HUGIwP7jbUN4E3H8_xTPXnhzopoD3fom2N2mQ69wujJ6iELXAsrZmFBPvbAALIFHXHsF_WVGZBlIkvKrFxUJw6D4LRnJk3OqWnEyqmuDWmPi1j3HsHvCZoPB96N5uRHPqIbb5UfHaT4gaDftTZVDnodEWYMVPzJRQNRQmdW_j6FCEAbqkZat7_kJeurz7vn2mfNAvqfgXdHLzdw_FfesnRD5hTu8CMSlA99rUdcbYMzecbYmRDWFENW4jFlLM0zEcVS90QMljibQFAKepaK7f4EmV6zdIaKzuGrYHhYFlqFhEcYhWCsnQj_HgYEVA4hVQlGC9gMzM1_G3SaqdENsoN353X18zmpVEej0LJ5dIyILWd7jqvfFsTpZbrP6jift9nkkdlUEcrAwCqO8HMeV4h2Mwt2UnTjWqX5TtpsBsEHloXbkrqu4_oz2yNVp72xc8xMny9LdZNalxzxlQx89_HeQxTr5thf5tTPoTphv0z1B6fU0P1xtupfRTlQ-_IFUUnGurO39SeioW7TIvS_IzO96VTOkA2APRRSmCdTvpxtWaZj0vFKFIZD_rMAnnFtRUYxczmKIiSJkDuOlwZYkh8pGa3xVejrWxTNEpXzTAZdD1Rd5lx-Qwy_sdaCzIVLoaXWZeLlpofbaiVzNjpHAAsI_IHh9YJ8jr4Nzwg2ZTtrVnlwjq41ApILkE9DCn-cHa5Kw6vPMAQjRFfwJlSPQ-llGQ-vGjoK86IG1ulUOUBOPXIUsDYkwcxFHD2KbAze0i96cTr8d5cXaISyzWpCcTFksHyiUC9xjhYbZC9NsOt3c_rpEz0M_QslqB" alt="logical data model diagram">

UML Source
----------

```
@startuml
scale 0.65

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

class Recipient {
  * id : integer
  * name : string
    recipientType : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Grant {
  * id : integer
  * number : string
  regionId : integer(32) REFERENCES public.Regions.id
  * recipientId : integer(32) REFERENCES public.Recipient.id
  status : string
  startDate : timestamp
  endDate : timestamp
  cdi : boolean
  * createdAt : timestamp
  * updatedAt : timestamp
}

class GrantGoal {
  * id : integer <<generated>>
  * recipientId : integer(32) REFERENCES public.Recipients.id
  * grantId : integer(32) REFERENCES public.Grants.id
  * goalId : integer(32) REFERENCES public.Goals.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class OtherEntities {
  * id : integer <<generated>>
  * name : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityReport {
  * id : integer <<generated>>
  legacyId: string
  ECLKCResourcesUsed : array<string>
  nonECLKCResourcesUsed: array<string>
  additionalNotes : string
  numberOfParticipants : integer
  deliveryMethod : string
  duration : decimal
  endDate : date
  startDate : date
  activityRecipientType : string
  requester : string
  programTypes : array<string>
  targetPopulations : array<string>
  virtualDeliveryType : string
  reason : array<string>
  participants : array<string>
  topics : array<string>
  context : string
  pageState : json
  oldManagerNotes : string
  * submissionStatus : string
  calculatedStatus: string
  ttaType : array<string>
  oldApprovingManagerId : integer(32) REFERENCES public.Users.id
  * userId : integer(32) REFERENCES public.Users.id
  lastUpdatedById : integer(32) REFERENCES public.Users.id
  * regionId : integer(32) REFERENCES public.Region.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityReportApprover {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * userId : integer(32) REFERENCES public.User.id
  status: string
  note : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Objective {
  * id : integer <<generated>>
  * goalId : integer(32) REFERENCES public.Goal.id
  title : string,
  ttaProvided : string,
  status : string,
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityParticipant {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  grantId : integer(32) REFERENCES public.Grant.id
  otherEntityId : integer(32) REFERENCES public.OtherEntity.id
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

class ActivityReportObjective {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * objectiveId : integer(32) REFERENCES public.Objective.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

User ||-o{ Region
User }o--|{ Permission
Scope }o--|{ Permission
Region }o--|{ Permission
Role }o--|{ Topic
Topic }|--|{ Goal
Recipient }o--|{ GrantGoal
Goal }o--|{ GrantGoal
Role .. RoleTopic
Topic .. RoleTopic
Topic .. TopicGoal
Goal .. TopicGoal
Recipient ||--|{ Grant
Region ||--|{ Grant
ActivityReport .. ActivityReportCollaborator
User .. ActivityReportCollaborator
ActivityReport .. NextSteps
ActivityReport .. ActivityReportGoal
ActivityReport ||--o{ ActivityReportApprover
ActivityReportApprover }o--|| User
Goal .. ActivityReportGoal
Goal }|--|{ ActivityReport
Goal ||-o{ Objective
ActivityReportObjective }o--|{ Objective
ActivityReportObjective }o--|{ ActivityReport

User ||-o{ ActivityReport
ActivityReport ||-o{ ActivityParticipant
Grant ||-{ ActivityParticipant
OtherEntity ||-{ ActivityParticipant
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/pLXVRzis47_Nf-3R_c09XWtRGn4KJLEt2DOcGPn-05gyoEmeddOyfJMIVFU5FfWH8pbHR2_hYmtzxl-V8qzw4rWJjxKhGgaTg5_t__oZA7vG-WgjKGtXp44Tr5VBSwLzvS2eal1hK9S0N8I_hMyqwLevwu4N3IWadcDHb4w7e3u787LTAFMpiaQzKjOpL43guA023wGPpElNI_8yG8ZSnv4jC5bVPRZNDNGf4JziUOvasKAu8saYlJWGXgZpeKGpHmydRJq3wi9GQ-kw05jsy4g1R-je1siuXygYF-u4yEFll_sapYVl9-UJawF9L3NjpDboNnZ3lZLBtvqE_14hw-y4sTOGMDVDab8InDWFkKTf6pD0kLqbL2oCIscUWAHYMc83csXGoa0eoJPiqITqgt3EW6eRmkYGsW0qeWwnOL8LQCFgXPYd4MBBV8hKTfNzfuN04oAaC2ORsCG7YxvRePPizx46dcCsKIHctg9Pv71eq0TOXn-XWOHl6IYweVPxh6KliB7bU9baHkH6THQX6rFig3NLcgFwO_EKpDABxHla0setBWTA1TRSXYuI5LxI0pORtXFMqreJXpa0Nx0-Spesr0pHWVPRUInbUypj2hKRaVIeudzA-Wbyuob3Sp-HUGIwP7jbUN4E3H8_xTPXnhzopoD3fom2N2mQ69wujJ6iELXAsrZmFBPvbAALIFHXHsF_WVGZBlIkvKrFxUJw6D4LRnJk3OqWnEyqmuDWmPi1j3HsHvCZoPB96N5uRHPqIbb5UfHaT4gaDftTZVDnodEWYMVPzJRQNRQmdW_j6FCEAbqkZat7_kJeurz7vn2mfNAvqfgXdHLzdw_FfesnRD5hTu8CMSlA99rUdcbYMzecbYmRDWFENW4jFlLM0zEcVS90QMljibQFAKepaK7f4EmV6zdIaKzuGrYHhYFlqFhEcYhWCsnQj_HgYEVA4hVQlGC9gMzM1_G3SaqdENsoN353X18zmpVEej0LJ5dIyILWd7jqvfFsTpZbrP6jift9nkkdlUEcrAwCqO8HMeV4h2Mwt2UnTjWqX5TtpsBsEHloXbkrqu4_oz2yNVp72xc8xMny9LdZNalxzxlQx89_HeQxTr5thf5tTPoTphv0z1B6fU0P1xtupfRTlQ-_IFUUnGurO39SeioW7TIvS_IzO96VTOkA2APRRSmCdTvpxtWaZj0vFKFIZD_rMAnnFtRUYxczmKIiSJkDuOlwZYkh8pGa3xVejrWxTNEpXzTAZdD1Rd5lx-Qwy_sdaCzIVLoaXWZeLlpofbaiVzNjpHAAsI_IHh9YJ8jr4Nzwg2ZTtrVnlwjq41ApILkE9DCn-cHa5Kw6vPMAQjRFfwJlSPQ-llGQ-vGjoK86IG1ulUOUBOPXIUsDYkwcxFHD2KbAze0i96cTr8d5cXaISyzWpCcTFksHyiUC9xjhYbZC9NsOt3c_rpEz0M_QslqB)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
