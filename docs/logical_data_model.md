Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLZTRjis5BxNK_1kFsYCOhiOK0H5qymT0cok4QSFG8idCZkAHpiyIcCaUVUP8ao8YfmmrfRUED3v__a-aKhnmR4aRcjJk58Q46zdlxqjYX-4l46jH4EuDb0xyKtpHaXR6L2Y9Fpcn3K05-vlRHj9iXP6M-1j0mA9DrWKfP7EYIyEIDmLGlmij1BlXBOC5P0uFQt00aa6zVvzfzuuSDxwmfiv9cshH6vb3NsDbv-rl47IhC7jL998Ra-3WOyvz6WsQ67HrckWlXXggKrVm9eDl1DWszhdmHekeT9eBteD_FZhBp-9o_cd-ULySJvVYQPT6rtEWg6RQTNLRgJZFx7ITkV8kWR7icuwJKdWUp_ZHvgsKIEQX_r0GuQyaQO3Y25M9JPmJ0GX5BYITCCQRPHEQcS9L6ldibjg7L367ZnWuXReoEqvFwSCjswUtclgPlzfmV6S2CdbJ0CR_w3HzZVKaku_ri0RJ1X58Sr7LDjKx1gq3Wx9pr51b4zi5CqO_9w2x1KskiptYMc2NnQo24tEidtKk6lsuI_KSpvT5TC1yWTAapS38HnBRbrVuWDUqy1Ckq-4zQgMn6u3m5SibqPwGAqH3KWxhUAkyQVAhdQwZA7x4Dzfw0kuvHL3us8BQGUoP7sZUNi93H8_NzPPOhylpo93GYulkDesCCwuWpsCuuQaPO1Sw0XH1GUVVoBban8E5Z0yaezzO-yBpq5KiFIE8sJn4kBV9SEWKR1gH5egFPKnoQ0yt7DUMaSqd8ugryzx7S7NgTH36we-vh8oBNNAqfpq10vRAhkxQdBUIgKqQxJIB90XGLa0_kVhfIJMfMxyf1DkA33w1cZxrwDJNBNnw5TGwbgQ19s-kGJ6KIHZPxk46Yn7bgVt0w1ab2CSQGWhahNt7xjziwGAU8bDQxfAnsm8f4CxecYIYGpLuGWOLR3qzOneIhGCjvmq82jOSPZELuUUkRMqEo6bcphwuccauoy1Q1-t__EjTJBRFg-_WiT69jbUy2ReIWjVLN6cRyAobeGtMe5Av0EelVblgDmZMLw7mvDT77Eql-Wr6rniVErb-2sYyMG0fEMVep5oZIGPwRNczLAYUPS3vNlSlLRPH_3XKDcHXAzQE-wpPaI85Kx0cz-TkBy_mJiHNbv1ye0d9_TtlNy95DsNzOWyU8qfq4JxxWEWw7x5mtqdyjCl0b-YMVVOAVpF8sa8EPi9_xSVSbGKaiPe0qb8x3kFAVQj9B9qIpx8OMw6qJrfCX8lVjKycolfvP0gZ7UW3ggmveYQuX3Umzpp3LDrWgc1AdrCR99J8Up7wyVLlUleGPiFO5LRcty1" alt="logical data model diagram">

UML Source
----------

```
@startuml
scale 0.70

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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/nLZTRjis5BxNK_1kFsYCOhiOK0H5qymT0cok4QSFG8idCZkAHpiyIcCaUVUP8ao8YfmmrfRUED3v__a-aKhnmR4aRcjJk58Q46zdlxqjYX-4l46jH4EuDb0xyKtpHaXR6L2Y9Fpcn3K05-vlRHj9iXP6M-1j0mA9DrWKfP7EYIyEIDmLGlmij1BlXBOC5P0uFQt00aa6zVvzfzuuSDxwmfiv9cshH6vb3NsDbv-rl47IhC7jL998Ra-3WOyvz6WsQ67HrckWlXXggKrVm9eDl1DWszhdmHekeT9eBteD_FZhBp-9o_cd-ULySJvVYQPT6rtEWg6RQTNLRgJZFx7ITkV8kWR7icuwJKdWUp_ZHvgsKIEQX_r0GuQyaQO3Y25M9JPmJ0GX5BYITCCQRPHEQcS9L6ldibjg7L367ZnWuXReoEqvFwSCjswUtclgPlzfmV6S2CdbJ0CR_w3HzZVKaku_ri0RJ1X58Sr7LDjKx1gq3Wx9pr51b4zi5CqO_9w2x1KskiptYMc2NnQo24tEidtKk6lsuI_KSpvT5TC1yWTAapS38HnBRbrVuWDUqy1Ckq-4zQgMn6u3m5SibqPwGAqH3KWxhUAkyQVAhdQwZA7x4Dzfw0kuvHL3us8BQGUoP7sZUNi93H8_NzPPOhylpo93GYulkDesCCwuWpsCuuQaPO1Sw0XH1GUVVoBban8E5Z0yaezzO-yBpq5KiFIE8sJn4kBV9SEWKR1gH5egFPKnoQ0yt7DUMaSqd8ugryzx7S7NgTH36we-vh8oBNNAqfpq10vRAhkxQdBUIgKqQxJIB90XGLa0_kVhfIJMfMxyf1DkA33w1cZxrwDJNBNnw5TGwbgQ19s-kGJ6KIHZPxk46Yn7bgVt0w1ab2CSQGWhahNt7xjziwGAU8bDQxfAnsm8f4CxecYIYGpLuGWOLR3qzOneIhGCjvmq82jOSPZELuUUkRMqEo6bcphwuccauoy1Q1-t__EjTJBRFg-_WiT69jbUy2ReIWjVLN6cRyAobeGtMe5Av0EelVblgDmZMLw7mvDT77Eql-Wr6rniVErb-2sYyMG0fEMVep5oZIGPwRNczLAYUPS3vNlSlLRPH_3XKDcHXAzQE-wpPaI85Kx0cz-TkBy_mJiHNbv1ye0d9_TtlNy95DsNzOWyU8qfq4JxxWEWw7x5mtqdyjCl0b-YMVVOAVpF8sa8EPi9_xSVSbGKaiPe0qb8x3kFAVQj9B9qIpx8OMw6qJrfCX8lVjKycolfvP0gZ7UW3ggmveYQuX3Umzpp3LDrWgc1AdrCR99J8Up7wyVLlUleGPiFO5LRcty1)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
