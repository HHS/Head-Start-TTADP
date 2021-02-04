Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLVRRkCs47tNL_2jRO0OHOkYm29Ox6xgBV9GDqYo7p2M9Z9RYiCEHzaQSVwzefaAeYnd6QkNbmGwSpyylBXuvmLOsiOKlWI3wjl5ZpyKnLSA7aXNoZ6j3JPUVTQoKM1hWvKgcJvxTOyeXVzTMmSCZJBQecmTAcBPK56K1hnNdpooUYoKEbDTjZTAMy6wWoukQhJ885YzVTkPDnvzyBqAJbvOsxf3BJGu_7ORihXgcpNo43vJs80sGqYq67oZqBPDo4uDtc2joLuDclZw----KJVBZykRvUfoUQjSkpQwN4H7lz3LFdN96BfyBrsWw0QzGEFsbjPL4vQdlqUFUNA6FniDsgUuBSdXAHcKgj2Nh9reiZqwQvnhv4PxdprIwv4ps0wBtdFD9wwH3pnbXEtv_2TMze-smvRCn3w73NBXGvCThb3BUlZPe6meKJ_7CX-esgQmTsGz7iClgS8UdpaecIdvlIJPEtAwp8_foyIuB6KncPp53bdxjPQG_ghwKio-Y_a2-Pd0v76Wb1UGrW-HaF2UHsxQVsHgRXjWyHj4kHEuDX04jIOo27PMnt7PNcgxxcmPf8SK_nVf35OmKw_pAnsjCxwUJZxLwZXG3klHCmQE11KHbfz0S3GeskeGdKrCa43EHZvXm9IQtBWOTPA6Pt2n8XkxFkK2drVwVIdwGSls1Xsnv9HdzDHokN-39NSGL9KMJHRCYWGJLKMX_tf_3Iowr2umdUo52er-GDx-Sd2pLMr_7LPOwWPCeiOmN2BR7e9-igwWHYjtMuSJT-RuVNYu9nnJpT24-803CsmleZKG8i0roZMvrkmxdV9X14zsmk0IHiRcU2nE6WJYF0UMagpWdv8C03NUIcJdDq-sWngm7SZfIfty63FWvLCKseVjl_oIUmwRB_c16FEs7IHx9QFXT7F5nbzr7CKGsnyF6N6htdasKMdxbsGCh8b1YFyhlbuho10otNx-LJEtxHDkaEUsmmHgjpkdHnMb7f4dEZ_VFGv-L1NnjzuX7gEc36Hw__qJgeXlwAVT7Wez554rlLj_FnVXpm4QKouMAlmVf9o6Oj4-smY9XSFaVOddKL8ivJaaEQxGIDsBBb_Cb_Hxp1Gf79cJjHoPqi_49pcJ8Y_1FcqUF1gE-hn3MxMD-Gi0">

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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/png/nLVRRkCs47tNL_2jRO0OHOkYm29Ox6xgBV9GDqYo7p2M9Z9RYiCEHzaQSVwzefaAeYnd6QkNbmGwSpyylBXuvmLOsiOKlWI3wjl5ZpyKnLSA7aXNoZ6j3JPUVTQoKM1hWvKgcJvxTOyeXVzTMmSCZJBQecmTAcBPK56K1hnNdpooUYoKEbDTjZTAMy6wWoukQhJ885YzVTkPDnvzyBqAJbvOsxf3BJGu_7ORihXgcpNo43vJs80sGqYq67oZqBPDo4uDtc2joLuDclZw----KJVBZykRvUfoUQjSkpQwN4H7lz3LFdN96BfyBrsWw0QzGEFsbjPL4vQdlqUFUNA6FniDsgUuBSdXAHcKgj2Nh9reiZqwQvnhv4PxdprIwv4ps0wBtdFD9wwH3pnbXEtv_2TMze-smvRCn3w73NBXGvCThb3BUlZPe6meKJ_7CX-esgQmTsGz7iClgS8UdpaecIdvlIJPEtAwp8_foyIuB6KncPp53bdxjPQG_ghwKio-Y_a2-Pd0v76Wb1UGrW-HaF2UHsxQVsHgRXjWyHj4kHEuDX04jIOo27PMnt7PNcgxxcmPf8SK_nVf35OmKw_pAnsjCxwUJZxLwZXG3klHCmQE11KHbfz0S3GeskeGdKrCa43EHZvXm9IQtBWOTPA6Pt2n8XkxFkK2drVwVIdwGSls1Xsnv9HdzDHokN-39NSGL9KMJHRCYWGJLKMX_tf_3Iowr2umdUo52er-GDx-Sd2pLMr_7LPOwWPCeiOmN2BR7e9-igwWHYjtMuSJT-RuVNYu9nnJpT24-803CsmleZKG8i0roZMvrkmxdV9X14zsmk0IHiRcU2nE6WJYF0UMagpWdv8C03NUIcJdDq-sWngm7SZfIfty63FWvLCKseVjl_oIUmwRB_c16FEs7IHx9QFXT7F5nbzr7CKGsnyF6N6htdasKMdxbsGCh8b1YFyhlbuho10otNx-LJEtxHDkaEUsmmHgjpkdHnMb7f4dEZ_VFGv-L1NnjzuX7gEc36Hw__qJgeXlwAVT7Wez554rlLj_FnVXpm4QKouMAlmVf9o6Oj4-smY9XSFaVOddKL8ivJaaEQxGIDsBBb_Cb_Hxp1Gf79cJjHoPqi_49pcJ8Y_1FcqUF1gE-hn3MxMD-Gi0)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
