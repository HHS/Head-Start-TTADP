Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/pLZTRjis5BxNK_1kFrY2OSDsKGH5qzGTWhLf4ASFG8idCZkAXoEFt1fntdsc3YoBbfn8iPVjAj1t_dy-aaxs9f3qL9Kc2xaq87u-_VstBFjEo0Lg9Pp7cO4oYA-QvaBQme0IkSUlGTm1K1R-qjP9BqjXj0LQEX3eQOvPbXiPWlWSm8lxJ8WVXLRYbT2Me5X3PsS5MF2IGBr-NOld0KBKlengWRosHO9RMK9R4l7pQXtAQz8GrYBflLoUiKBqkMlXvcZXgYfduDimb5ARDa2Q3BmIOAioni4IRg3GQ2zR1Np_woy_Y9l9-ydDvEfYCXMkcXcTdx9YEDMgpjt8G1-mq7PjIBg4GB9qjIJt46i_fuwaSgf7yh1fA4SOrjAq0OsBQOuEdkD120KXzzgHHjkW1vLp3RxK8GmkgGhW1ymXBamp1V_CwONOfm5cTJ_Pwh39_bsjiOdtwCEGRg2B7nfjUqALr-tF4cYE2QCyXtcBQfd2mQ4Di0-_G0KDVc2XQFhMxx6LlKMdyr4s78Rj1csMHpDasD5hCskAxY_LKpPr5eSlo1yepR0U2158KXNQI7HuvtVKT7ZliPoMqbEO0z0joMiZuqBD40r8Ur36FBR7qYxMiW5DZox-ewPVmJUQ4hWj8zCAP4vweMbv0muzFPtMUQA_ISyYGMii3Dmk7VGpRcyD_NlZfIM0eQiZHC46CVvnACyfx4sWSoK_yyJU93vaerWp6dR8meYdTv9Wfr2mgWVDbJuIOxXHp9W1XzRuWjDM3RLZg_5yFP1wQ3dhvpnM3WkTidH8U0E5p9UNgXL_Sl7XpuiR25Zvl7x3ghv7AjgkNbTDAgL9evNc2WcINMNwVBgxbfvqhbsSLy8m1KOlm2y_Tju2gceU40foNKgJx7XiqGuP66gTUkk06YpnMT5vPQIqTXuBBykes_TU9-aBe6jqbQcpwjDPQ4-LDE-0I-g6bG5jZvrhDQShvZkbJv2Z9VX6IHMoW2bnExu4Z8H7epvAkyPzEXr-HbOpVkBQQUUSoQN9OxMWMDOI4KckBis9evqxvt6n_kQmev_4uv_HHWRwpAHvk_oNN-1iTZJwShE6_GxjNkXYv8q-liFjIwZDQwHZ7MUVPbyWPZdW81rvodFkfCbiS_s9j_SwRgW2bU1SPG8TOSwje-_bXZpk2cKJsrnf0-oszz-H2N61niWPUaduVoR5llJZthrescFui3_jb8GlbJjkeWxmq6HumBx5sOdLwWJl1H_cZ3pWoSdgllNldep_2zN5sQfFW6QZppyiC_vr_x2geTZzZFdIgDMVB41fEYYxF3qLyM_BPJ_4GRVUKeG3nygR49jI4YoTKdIodvlSkiTLklwQNwnFnU8Uf52TBDxlkK6pVfWRkn8nNUvDRoWMyRXsn2pYjMcsCDl37mutGZ4LjtQq8qe_MQVlbk5vHtc_U7jqxzTv0rPLfVa7" alt="logical data model diagram">

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

class Grantee {
  * id : integer
  * name : string
    granteeType : string
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
  cdi : boolean
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
NonGrantee ||-{ ActivityParticipant
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/pLZTRjis5BxNK_1kFrY2OSDsKGH5qzGTWhLf4ASFG8idCZkAXoEFt1fntdsc3YoBbfn8iPVjAj1t_dy-aaxs9f3qL9Kc2xaq87u-_VstBFjEo0Lg9Pp7cO4oYA-QvaBQme0IkSUlGTm1K1R-qjP9BqjXj0LQEX3eQOvPbXiPWlWSm8lxJ8WVXLRYbT2Me5X3PsS5MF2IGBr-NOld0KBKlengWRosHO9RMK9R4l7pQXtAQz8GrYBflLoUiKBqkMlXvcZXgYfduDimb5ARDa2Q3BmIOAioni4IRg3GQ2zR1Np_woy_Y9l9-ydDvEfYCXMkcXcTdx9YEDMgpjt8G1-mq7PjIBg4GB9qjIJt46i_fuwaSgf7yh1fA4SOrjAq0OsBQOuEdkD120KXzzgHHjkW1vLp3RxK8GmkgGhW1ymXBamp1V_CwONOfm5cTJ_Pwh39_bsjiOdtwCEGRg2B7nfjUqALr-tF4cYE2QCyXtcBQfd2mQ4Di0-_G0KDVc2XQFhMxx6LlKMdyr4s78Rj1csMHpDasD5hCskAxY_LKpPr5eSlo1yepR0U2158KXNQI7HuvtVKT7ZliPoMqbEO0z0joMiZuqBD40r8Ur36FBR7qYxMiW5DZox-ewPVmJUQ4hWj8zCAP4vweMbv0muzFPtMUQA_ISyYGMii3Dmk7VGpRcyD_NlZfIM0eQiZHC46CVvnACyfx4sWSoK_yyJU93vaerWp6dR8meYdTv9Wfr2mgWVDbJuIOxXHp9W1XzRuWjDM3RLZg_5yFP1wQ3dhvpnM3WkTidH8U0E5p9UNgXL_Sl7XpuiR25Zvl7x3ghv7AjgkNbTDAgL9evNc2WcINMNwVBgxbfvqhbsSLy8m1KOlm2y_Tju2gceU40foNKgJx7XiqGuP66gTUkk06YpnMT5vPQIqTXuBBykes_TU9-aBe6jqbQcpwjDPQ4-LDE-0I-g6bG5jZvrhDQShvZkbJv2Z9VX6IHMoW2bnExu4Z8H7epvAkyPzEXr-HbOpVkBQQUUSoQN9OxMWMDOI4KckBis9evqxvt6n_kQmev_4uv_HHWRwpAHvk_oNN-1iTZJwShE6_GxjNkXYv8q-liFjIwZDQwHZ7MUVPbyWPZdW81rvodFkfCbiS_s9j_SwRgW2bU1SPG8TOSwje-_bXZpk2cKJsrnf0-oszz-H2N61niWPUaduVoR5llJZthrescFui3_jb8GlbJjkeWxmq6HumBx5sOdLwWJl1H_cZ3pWoSdgllNldep_2zN5sQfFW6QZppyiC_vr_x2geTZzZFdIgDMVB41fEYYxF3qLyM_BPJ_4GRVUKeG3nygR49jI4YoTKdIodvlSkiTLklwQNwnFnU8Uf52TBDxlkK6pVfWRkn8nNUvDRoWMyRXsn2pYjMcsCDl37mutGZ4LjtQq8qe_MQVlbk5vHtc_U7jqxzTv0rPLfVa7)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
