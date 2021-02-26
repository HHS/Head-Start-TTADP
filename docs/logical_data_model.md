Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLVlRjis4F-kf-2tRGLY31k60KLGjCtS8S2M1N7w06Vf8dEZUDpnbDP8ykupHLSsBJbXBMpxaa2_-__Z7Oz-wmLOsiOKlWI3wllPppyLnJSAxabNoZ4j3JPUVTAoKc1hWvKgcJvvTOSeXVzBMmSCZJBQegmTAc9PKL6K1hnN7psoUYYKUgLqfLuhRGNh3NH-NgD51i7gpPkDUENH1ztBeEI5jQqtg8K6zx_TYYnUjSqIUHz-fR01RVOXqMBmjKBRDi4xDNY3jIPxkPV4jp_-y9swcN-OtyolBkOBvTgbqUKiAlgPhZhN1hpyHhMs6qFH3Ng1ndMIaZ7a_qu6ajPL8vAdBwJ423cql4efsBbObEJm50zALUXBrauqsHwTLCurSgEzpowfzSWPvn3QeJy5Fl7qVE0fmwpZCrXDFTc_smqsPoRsEMoG2n-QxFu9jQptFnkK5ILpmJ7CUwhMAUmTMO_7y0kgiCSd5afchFsUQzbRShhCiqd2HBkipc8ocDCZP7PdBS7zPVMIJPV5z0RvbS3aSQ2K5v3MxoF1uHqVg6d_WQbPDC3YLuXoAt1j83JKaiWWs6aPTuK_btQzaMMG7bpyJwHVuMTP2BhTHAOLG2dwNilw1Xsnl9pMkqJ_ItgM19FX2i3jsk7un1sjORnl6AnWtiXD8Yj6EXfdi7jFlPZhM526uRRqQ3YOYO2m_0A21uMYhGReT6925-VSHISKc5AJQnUiJXZ3gHD5DcPzuXjaGkXq-7B2CtfgkUmUcCaQXQhIOVU2kIB1fAjYe_znTmqikjGkC9tCGeL6toElVnyivwhjDtg5fMx09DqOYalQjeTsrz0ce4OhuV8OMVk7Zz_XJ3Yccg49zW47PbYVHsaWH81hb6johUao7TDX14zsHE1IHWx4yMOV5GZ4UWQIagpWPqaAW1eN4jdvqvFTG0tO3SZfIPtydZJWvMDijFVhV_ankZMRtlAxPipg--5YKwTijg-wZgA9xQ-73BlTNJAPg3Jz2p86biGWnFyLNr_RaC5aFFtSLJCzxHCso3RjK85wV3oZ1nLRFI9FT7Rs-B3tkx28FrU7UBGQ4v3fzRjNOD7zLK-F7HHoA6BNz6hzVYx2dm4QNSvcAlpVTpaAnQ0xRoaI0uVA-n3RKb8ivJauETwXaRhdLOR--gVjYx6IMew9jlIcukIS3qJfPwAJt5UHio0V5-ykWUCwRz5MRMF-0G00" alt="logical data model diagram">

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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/nLVlRjis4F-kf-2tRGLY31k60KLGjCtS8S2M1N7w06Vf8dEZUDpnbDP8ykupHLSsBJbXBMpxaa2_-__Z7Oz-wmLOsiOKlWI3wllPppyLnJSAxabNoZ4j3JPUVTAoKc1hWvKgcJvvTOSeXVzBMmSCZJBQegmTAc9PKL6K1hnN7psoUYYKUgLqfLuhRGNh3NH-NgD51i7gpPkDUENH1ztBeEI5jQqtg8K6zx_TYYnUjSqIUHz-fR01RVOXqMBmjKBRDi4xDNY3jIPxkPV4jp_-y9swcN-OtyolBkOBvTgbqUKiAlgPhZhN1hpyHhMs6qFH3Ng1ndMIaZ7a_qu6ajPL8vAdBwJ423cql4efsBbObEJm50zALUXBrauqsHwTLCurSgEzpowfzSWPvn3QeJy5Fl7qVE0fmwpZCrXDFTc_smqsPoRsEMoG2n-QxFu9jQptFnkK5ILpmJ7CUwhMAUmTMO_7y0kgiCSd5afchFsUQzbRShhCiqd2HBkipc8ocDCZP7PdBS7zPVMIJPV5z0RvbS3aSQ2K5v3MxoF1uHqVg6d_WQbPDC3YLuXoAt1j83JKaiWWs6aPTuK_btQzaMMG7bpyJwHVuMTP2BhTHAOLG2dwNilw1Xsnl9pMkqJ_ItgM19FX2i3jsk7un1sjORnl6AnWtiXD8Yj6EXfdi7jFlPZhM526uRRqQ3YOYO2m_0A21uMYhGReT6925-VSHISKc5AJQnUiJXZ3gHD5DcPzuXjaGkXq-7B2CtfgkUmUcCaQXQhIOVU2kIB1fAjYe_znTmqikjGkC9tCGeL6toElVnyivwhjDtg5fMx09DqOYalQjeTsrz0ce4OhuV8OMVk7Zz_XJ3Yccg49zW47PbYVHsaWH81hb6johUao7TDX14zsHE1IHWx4yMOV5GZ4UWQIagpWPqaAW1eN4jdvqvFTG0tO3SZfIPtydZJWvMDijFVhV_ankZMRtlAxPipg--5YKwTijg-wZgA9xQ-73BlTNJAPg3Jz2p86biGWnFyLNr_RaC5aFFtSLJCzxHCso3RjK85wV3oZ1nLRFI9FT7Rs-B3tkx28FrU7UBGQ4v3fzRjNOD7zLK-F7HHoA6BNz6hzVYx2dm4QNSvcAlpVTpaAnQ0xRoaI0uVA-n3RKb8ivJauETwXaRhdLOR--gVjYx6IMew9jlIcukIS3qJfPwAJt5UHio0V5-ykWUCwRz5MRMF-0G00)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
