Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLVTRjis5BxNK_1kFsYCOhiOK0H5qymT0cok4QSFG8idCZkAHpiyIcCaUVUP8iA8YfmmrfRU9F3v__a-alhWM1AtjIbSAGs8jxFVtXR53q9UeLQY8LmRg9tufdaZfAqCA54IVdFY4e0BzxUsZIHP2wCjyBO1WSGRB8hIIEV45mSaRWeXVXPQYNT2MuOAI1mVLs2198Dw_xvJRnmuRttcpHoJjbKYjxA6liRBJrhU86dMu7OgIIItny70nnnwD1kqi6ZhDL1V3BNKfYzWpGRU2R1jxVDW3UTGQRHdlGP-_FMNdyJv_DFyVBuudQz4qwwDBcV1qCsqwcetql6VM6cxSsHTWsDPDvsc9F2zd_0ZJTke4StT_K13XhoHfWE88LObDd18124Kk99qmnfjb4vgPmbKQ-UoMseTKCOUF63Y5kZ0xJa_fmotRfxUQ-fc_sd1yPm8oULC0nl_GwFjRwWbtVzP0symOHI5D1zHRLEnQz0ws2S_HGLHFh5HD6FmUmgo5zZeCjydfWb-MSWYD3dBzb7Zhjc7FrFF-NHLJ0V87oXDtWo4S2ovTNs93tX90pFjFX7MgreIkmq0Nx1S6ka1jKOq8EsaYiFQdYgxskaoXkv3VAUXB-2QLmpD0oFJ3cJ9-ahpzXmQ97w-h9F4_huyYmm9kRpWOjl0EEFszZ2E6vAM8PDoKuOLCktDCxnv3pwOgz1G3d22fNSSuOIN4Fyk6GQDWbKZqbBfgSH81kLHdN4s7T9mEgfSF-zrA2qdC0njgFgGDycqr2aPSz8JE6ofx9waoRKgbTAiqKgpG8O4PG7udo-NabYNkl6JJhYXmEWheErVZovhrSORNa6fQsaITFhc4XX7aOoTxH9giEmFav5d050ooX6ED8GLoThxZpsoML85lCIcDLsbOpO4qg4TKJJfH0RgSDAFAbZwUaOq9Lg6QquQa1MiE4pdgqFFt5hQdP3IJHtylZJIyPS0j8_R__bnEfbjdzTVmMCZWsmlF0b2QQpPF03jJLZMal1AAr29V02rD_yDbNiao-jmU86B0sxmbnspmSN6Oo_3Rn6D9mCWBVyKZP5h9Cb8hpYl5n7Dk-mft-FkjSe-W0_xoeuaVDNQyJvhHeHOuGIy-Ts9sziZl17Xy0gIEpmwkhtfVVaNtGVqY3nuZIdGHFlkdLzqVyNTRIVoqoy2Nw9PV74L_iyZQGWvcmd_lnToN1IIncW3IKZiEuyfxbj9PEcMV93zt0oZUz9a95xyU7asLzBBFbKOxq0TL67D4JN5Fho7kUSRfke4KmDL-ZEnIMw5i1-l7rS_7BNxRJw0LMrj_WK0" alt="logical data model diagram">

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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/nLVTRjis5BxNK_1kFsYCOhiOK0H5qymT0cok4QSFG8idCZkAHpiyIcCaUVUP8iA8YfmmrfRU9F3v__a-alhWM1AtjIbSAGs8jxFVtXR53q9UeLQY8LmRg9tufdaZfAqCA54IVdFY4e0BzxUsZIHP2wCjyBO1WSGRB8hIIEV45mSaRWeXVXPQYNT2MuOAI1mVLs2198Dw_xvJRnmuRttcpHoJjbKYjxA6liRBJrhU86dMu7OgIIItny70nnnwD1kqi6ZhDL1V3BNKfYzWpGRU2R1jxVDW3UTGQRHdlGP-_FMNdyJv_DFyVBuudQz4qwwDBcV1qCsqwcetql6VM6cxSsHTWsDPDvsc9F2zd_0ZJTke4StT_K13XhoHfWE88LObDd18124Kk99qmnfjb4vgPmbKQ-UoMseTKCOUF63Y5kZ0xJa_fmotRfxUQ-fc_sd1yPm8oULC0nl_GwFjRwWbtVzP0symOHI5D1zHRLEnQz0ws2S_HGLHFh5HD6FmUmgo5zZeCjydfWb-MSWYD3dBzb7Zhjc7FrFF-NHLJ0V87oXDtWo4S2ovTNs93tX90pFjFX7MgreIkmq0Nx1S6ka1jKOq8EsaYiFQdYgxskaoXkv3VAUXB-2QLmpD0oFJ3cJ9-ahpzXmQ97w-h9F4_huyYmm9kRpWOjl0EEFszZ2E6vAM8PDoKuOLCktDCxnv3pwOgz1G3d22fNSSuOIN4Fyk6GQDWbKZqbBfgSH81kLHdN4s7T9mEgfSF-zrA2qdC0njgFgGDycqr2aPSz8JE6ofx9waoRKgbTAiqKgpG8O4PG7udo-NabYNkl6JJhYXmEWheErVZovhrSORNa6fQsaITFhc4XX7aOoTxH9giEmFav5d050ooX6ED8GLoThxZpsoML85lCIcDLsbOpO4qg4TKJJfH0RgSDAFAbZwUaOq9Lg6QquQa1MiE4pdgqFFt5hQdP3IJHtylZJIyPS0j8_R__bnEfbjdzTVmMCZWsmlF0b2QQpPF03jJLZMal1AAr29V02rD_yDbNiao-jmU86B0sxmbnspmSN6Oo_3Rn6D9mCWBVyKZP5h9Cb8hpYl5n7Dk-mft-FkjSe-W0_xoeuaVDNQyJvhHeHOuGIy-Ts9sziZl17Xy0gIEpmwkhtfVVaNtGVqY3nuZIdGHFlkdLzqVyNTRIVoqoy2Nw9PV74L_iyZQGWvcmd_lnToN1IIncW3IKZiEuyfxbj9PEcMV93zt0oZUz9a95xyU7asLzBBFbKOxq0TL67D4JN5Fho7kUSRfke4KmDL-ZEnIMw5i1-l7rS_7BNxRJw0LMrj_WK0)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
