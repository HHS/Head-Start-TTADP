Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLVDRkCs4BxhANXh6o16qQ8zB8B5xgRU8eUwGP9zWB4qaTbI77OuojP8ykurnPGGRINBMFsv9D0t_ny_QkHtNe2bxqpbQp2elbty-4DLVQNWZdIZ7DFQOEVLPoqR1ROrsAYQwRDNjuXI-T-rTS3GAQCjojQX8fODLLLjm7lroIEh-qgf4wKRzKPfAzZkeBEp5Yqo23Plt-xC6uy--5u49o-iRRj3BNGuVdORihZgkpNo63vHs84sOqYq67oZqFPTo4uTNc6hoLwCclZw----KLVBZykhvUfyUQrSlpQwNaH7lz3DaBfc35s-brsWw0wzGES6I--Q2SlZtwF7F2N3d-mDcb9Sr-Jmc0nADUXhrauqsOJE6kSIkTFU5u_KU-G2jiEX9wxvo3FoWQU2i87FV-9a_-ZHovAPs9UmGIuyQBBZ4-fPZnyxb0rbwkTOvWCrsnpsZgp7v_1pQZ3XCmSbCoM_boHxGqxNvJ6fJ8mhKXQJAJdia3MTjOJq5ysNOeOkvWlaPm9Jne5INa1wFqP2mblUSzF-8rDttG6Bto3AZS2bWI2eDP51iFCw7WP_gUrsPoiWFQJulqXdi8A5UfrVwTaw1-lfsBTQ6mSgOJrwni13GGqR_YSGt1iKRNE0pYScIA3a8XynO4vDQLo8EaR3yxXOaOrT7xF0vvL-Nuk-qxAzGaSi9UKPFVLS3zzWsGw2fj5XSO5PaM2cgYZqNsylWKNNsWMcixlGeD5toDjV3ZPRqwTrs62jEp2P6iDmcMmJ16coNK6DLcws3YTsvlxtuU6TS4mjGnVY0mxCi3sBra280BSeb-HwCtGwvSC8dko4mMMCx9lZQt7I813dER3KP0N_b6m0QF5Q8Zk_UR97VtGPyF8f2kh3zb_-OdiAco_jaUZAhXTaTwAWuVmInSPVzTg98JQz1WhYLibvDb5v--Ta3Ao9GOZ_AxvUAyWGCjr--KgPs_OHc-AfxJ21UdWufNiLfHwHHpezVRWV_NYguc-wGpn6JHd89F_XKwaQ_gh7Xm4AFLHHDSajxU4g_3b0Oyh5GeN_evJJK2oQiYLaN3XCdaeyZP9ZESyXoVCAZTIzxFAbV5c_XwRim7BpNkhC9tlnnE63VTgSRZC-x_CERTDtvYy0">

UML Source
----------

```
@startuml
scale 0.65

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
ActivityReport .. ActivityReportGoal
Goal .. ActivityReportGoal

User ||-o{ ActivityReport
ActivityReport ||-o{ ActivityParticipant
Grant ||-{ ActivityParticipant
NonGrantee ||-{ ActivityParticipant
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/png/nLVDRkCs4BxhANXh6o16qQ8zB8B5xgRU8eUwGP9zWB4qaTbI77OuojP8ykurnPGGRINBMFsv9D0t_ny_QkHtNe2bxqpbQp2elbty-4DLVQNWZdIZ7DFQOEVLPoqR1ROrsAYQwRDNjuXI-T-rTS3GAQCjojQX8fODLLLjm7lroIEh-qgf4wKRzKPfAzZkeBEp5Yqo23Plt-xC6uy--5u49o-iRRj3BNGuVdORihZgkpNo63vHs84sOqYq67oZqFPTo4uTNc6hoLwCclZw----KLVBZykhvUfyUQrSlpQwNaH7lz3DaBfc35s-brsWw0wzGES6I--Q2SlZtwF7F2N3d-mDcb9Sr-Jmc0nADUXhrauqsOJE6kSIkTFU5u_KU-G2jiEX9wxvo3FoWQU2i87FV-9a_-ZHovAPs9UmGIuyQBBZ4-fPZnyxb0rbwkTOvWCrsnpsZgp7v_1pQZ3XCmSbCoM_boHxGqxNvJ6fJ8mhKXQJAJdia3MTjOJq5ysNOeOkvWlaPm9Jne5INa1wFqP2mblUSzF-8rDttG6Bto3AZS2bWI2eDP51iFCw7WP_gUrsPoiWFQJulqXdi8A5UfrVwTaw1-lfsBTQ6mSgOJrwni13GGqR_YSGt1iKRNE0pYScIA3a8XynO4vDQLo8EaR3yxXOaOrT7xF0vvL-Nuk-qxAzGaSi9UKPFVLS3zzWsGw2fj5XSO5PaM2cgYZqNsylWKNNsWMcixlGeD5toDjV3ZPRqwTrs62jEp2P6iDmcMmJ16coNK6DLcws3YTsvlxtuU6TS4mjGnVY0mxCi3sBra280BSeb-HwCtGwvSC8dko4mMMCx9lZQt7I813dER3KP0N_b6m0QF5Q8Zk_UR97VtGPyF8f2kh3zb_-OdiAco_jaUZAhXTaTwAWuVmInSPVzTg98JQz1WhYLibvDb5v--Ta3Ao9GOZ_AxvUAyWGCjr--KgPs_OHc-AfxJ21UdWufNiLfHwHHpezVRWV_NYguc-wGpn6JHd89F_XKwaQ_gh7Xm4AFLHHDSajxU4g_3b0Oyh5GeN_evJJK2oQiYLaN3XCdaeyZP9ZESyXoVCAZTIzxFAbV5c_XwRim7BpNkhC9tlnnE63VTgSRZC-x_CERTDtvYy0)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
