Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLVRRjms47tNL_2jhG4RHOkYG604ITnDuOTk3TlvW5bfh6LBSjZXoEd2zhzNNAQgg9LTPjNBIsATkHyUNlPD463fhAb23GRLrsVVVrTLNoYu9zqepxGnQ8Fwg6MhmBK66rKpVGpg3b6gyAjs7XYiCjgXx3mgOjbILTK6Gb0V0h9wg9GwKNssLqexmRQ7pizRTCWWsBn-tPkt0KFqlOnEGLYxjaSTM1n_-oqvN7TsWpo6JnHQq6OCYHQ3hnIwpiRiPF4QMqtkSjJ4bzz-yvMwNhrVNQ_M5wiRvRkDqVLPSWndkjcdhXbZbs-b3nHjCGXOlxTqlfcnFFqvUifJClp9PD0XnKrD7e_9e5I3eMRjHPCRq4NZN25R7KBnI5r0Bc0xBlh0DH-vHY7oL12sv_EVMDdVkXvRCHE74ZR8nmzDRhn27UlnfqNPKgP-JcNUKRFBuU391NmElw061tpXe6JcvFUIP6_9wxeyPYYJuegKnMHA5Zjc7TPQOlhBvkzYzbqi5yYF1AQC0wM2W7HXZCI4Tpnnq-4zaxsnm1AsY78hS6KW2cf3P13SeexJihtKTjlR2aYFAVulqXcSOA5UbrTwjixqUZhwL6lJG2Mi9yyKE15KGbX-0C79eEYQ0tGvCL421Hlvc05pQahZKjGH6bx4nPfSwlgO2tnPwRUrw7ijkslqn59IdZ5Gn_N-3PRTGT0qEbvSODOacAag2VtdkojWqRNsaUbiBpHez3toxgU3cwtfXkkmmLfRC9aQut23R3C8XidwWXgTtEuypjoPq_VXuPxmJ2s3ZV4H1sROdITh94I0MvGhyftPTphdmmY1t8p1vunCpEbOd3K8f7aEB3KvmTyb6m1Ql974pY-1tD6FBWD1FYH1lTlzoo-sJs7BfJqINTdsWcnF53ISRwBK-6STEod43ST0GTnwS5vELDR-1Ha36s8Gul-AhyyLP0pfsuz_giV7KtfGIJC9UQBJqyU7qQ-GAlquEiHJr9o1pE2_VtDKwT7vzBY7uh5V9Ve7j-52g-8_1sXAUNQcul-ZbFDGAZfaco2fS9nyAF5fb1pBUOv9db_gHDsBBXdXcTkqLEQJxS3KVBJFc_-IzVC-Rz0rdJL_0000">

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

User ||-o{ ActivityReport
ActivityReport ||-o{ ActivityParticipant
Grant ||-{ ActivityParticipant
NonGrantee ||-{ ActivityParticipant
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/nLVRRjms47tNL_2jhG4RHOkYG604ITnDuOTk3TlvW5bfh6LBSjZXoEd2zhzNNAQgg9LTPjNBIsATkHyUNlPD463fhAb23GRLrsVVVrTLNoYu9zqepxGnQ8Fwg6MhmBK66rKpVGpg3b6gyAjs7XYiCjgXx3mgOjbILTK6Gb0V0h9wg9GwKNssLqexmRQ7pizRTCWWsBn-tPkt0KFqlOnEGLYxjaSTM1n_-oqvN7TsWpo6JnHQq6OCYHQ3hnIwpiRiPF4QMqtkSjJ4bzz-yvMwNhrVNQ_M5wiRvRkDqVLPSWndkjcdhXbZbs-b3nHjCGXOlxTqlfcnFFqvUifJClp9PD0XnKrD7e_9e5I3eMRjHPCRq4NZN25R7KBnI5r0Bc0xBlh0DH-vHY7oL12sv_EVMDdVkXvRCHE74ZR8nmzDRhn27UlnfqNPKgP-JcNUKRFBuU391NmElw061tpXe6JcvFUIP6_9wxeyPYYJuegKnMHA5Zjc7TPQOlhBvkzYzbqi5yYF1AQC0wM2W7HXZCI4Tpnnq-4zaxsnm1AsY78hS6KW2cf3P13SeexJihtKTjlR2aYFAVulqXcSOA5UbrTwjixqUZhwL6lJG2Mi9yyKE15KGbX-0C79eEYQ0tGvCL421Hlvc05pQahZKjGH6bx4nPfSwlgO2tnPwRUrw7ijkslqn59IdZ5Gn_N-3PRTGT0qEbvSODOacAag2VtdkojWqRNsaUbiBpHez3toxgU3cwtfXkkmmLfRC9aQut23R3C8XidwWXgTtEuypjoPq_VXuPxmJ2s3ZV4H1sROdITh94I0MvGhyftPTphdmmY1t8p1vunCpEbOd3K8f7aEB3KvmTyb6m1Ql974pY-1tD6FBWD1FYH1lTlzoo-sJs7BfJqINTdsWcnF53ISRwBK-6STEod43ST0GTnwS5vELDR-1Ha36s8Gul-AhyyLP0pfsuz_giV7KtfGIJC9UQBJqyU7qQ-GAlquEiHJr9o1pE2_VtDKwT7vzBY7uh5V9Ve7j-52g-8_1sXAUNQcul-ZbFDGAZfaco2fS9nyAF5fb1pBUOv9db_gHDsBBXdXcTkqLEQJxS3KVBJFc_-IzVC-Rz0rdJL_0000)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
