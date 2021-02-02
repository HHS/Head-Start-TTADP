Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLVRRkCs47tNL_2jRO0OHOkYm29Ox6xgBV9GDqYo7p2M9Z9RYiCEHzaQSVwzffWAeYnd6QkNbmGwSpyyrCZll01BsvZ2bs1GVRluyOUY-4h10-bAEQQrmSQhpres2cnji58bqsUlxX6byBzhwu2XKKPRbAr3HImRAehIWFVgaqTMZuLIPqfNwetILh3UGnSNDLfa4ApUljsRDnvzyBqAJbvOstgFMcXm-EmsP77LDcla8Noci05jXf1eCVX6eMsRa9qQlC5QaxqQDF7rzzzzeswM7vStozNbybQvTcrqkOYEVg6hBdN96BfyB_j0qGrwWSPrbjPL4vQdlqUFUNA6FniDsgUuBSdXAHcKgj2Nh9reiZqwQvnhv4PxdprIwv4ps0w7tdFD9vwH3pnbX7Ly_XCd-qUBNfRCn3w73NBXGPCTdb3BUlZOe6meKJ_7CX-esgQmTsGz7iClgS8UdpaecIdvlIJPEtAwp8_foyIuB6KncPp33bdxivQG_ghwKapNnNo1_4nWyZXGoWj8wuT8I7ZF8pVjFp8rjmsm-0sYt0bS6mY2MXCP13klusxmbzgkzxOCqaEA_ujq1YkOgTVvbOxM6Q-dazzgTHmeX_Ne6GCF1TLj-9z0S3GeskeGdKrCa436HJvbm9IQtBWOTPA6Pt2n8XkxFcM1polzlXJze6LxWuvOSiepUcgvxBx1aXq4LQN3uWAp8i54LL7elzvV0uikjGjC9tUXGgCVaBU_76osgktNOOMbRi0aQWp39RBj8UWdsnVKQELkwt1YPuw_3m_lX6Eg6PeG7t1WXkr5j0P21BX6kIRNcgxJAHz6y6Gd32vbP6IEhyL9Wq2Svy1IaXNyKv81eCPRYUpyvicU_D5bmCkdAAWFst_vY-qvRBwq1wBBkrwGt8cCXjDB51j_rMidXjZ-DP0Hj-gTPnELjdz9ni2Q68Jul-BhjO8C8TFjvw-KkMsVi2cUsmuJgDtkd1vLb7f4dkZyVFSu-F5KnDzqXtYCcZAGwVsxJwMY-wkUTXqKUYYYQdgtVWyNuSy16bCk5Yhy7wISXcBHFji8YON3v7s9vr5IBEKv93ckq4ZToovVofVqUymKAHoPaxCScTB7n2Tv9qLUWdtQt5zqFExp3ctLDkOl">

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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/nLVRRkCs47tNL_2jRO0OHOkYm29Ox6xgBV9GDqYo7p2M9Z9RYiCEHzaQSVwzffWAeYnd6QkNbmGwSpyyrCZll01BsvZ2bs1GVRluyOUY-4h10-bAEQQrmSQhpres2cnji58bqsUlxX6byBzhwu2XKKPRbAr3HImRAehIWFVgaqTMZuLIPqfNwetILh3UGnSNDLfa4ApUljsRDnvzyBqAJbvOstgFMcXm-EmsP77LDcla8Noci05jXf1eCVX6eMsRa9qQlC5QaxqQDF7rzzzzeswM7vStozNbybQvTcrqkOYEVg6hBdN96BfyB_j0qGrwWSPrbjPL4vQdlqUFUNA6FniDsgUuBSdXAHcKgj2Nh9reiZqwQvnhv4PxdprIwv4ps0w7tdFD9vwH3pnbX7Ly_XCd-qUBNfRCn3w73NBXGPCTdb3BUlZOe6meKJ_7CX-esgQmTsGz7iClgS8UdpaecIdvlIJPEtAwp8_foyIuB6KncPp33bdxivQG_ghwKapNnNo1_4nWyZXGoWj8wuT8I7ZF8pVjFp8rjmsm-0sYt0bS6mY2MXCP13klusxmbzgkzxOCqaEA_ujq1YkOgTVvbOxM6Q-dazzgTHmeX_Ne6GCF1TLj-9z0S3GeskeGdKrCa436HJvbm9IQtBWOTPA6Pt2n8XkxFcM1polzlXJze6LxWuvOSiepUcgvxBx1aXq4LQN3uWAp8i54LL7elzvV0uikjGjC9tUXGgCVaBU_76osgktNOOMbRi0aQWp39RBj8UWdsnVKQELkwt1YPuw_3m_lX6Eg6PeG7t1WXkr5j0P21BX6kIRNcgxJAHz6y6Gd32vbP6IEhyL9Wq2Svy1IaXNyKv81eCPRYUpyvicU_D5bmCkdAAWFst_vY-qvRBwq1wBBkrwGt8cCXjDB51j_rMidXjZ-DP0Hj-gTPnELjdz9ni2Q68Jul-BhjO8C8TFjvw-KkMsVi2cUsmuJgDtkd1vLb7f4dkZyVFSu-F5KnDzqXtYCcZAGwVsxJwMY-wkUTXqKUYYYQdgtVWyNuSy16bCk5Yhy7wISXcBHFji8YON3v7s9vr5IBEKv93ckq4ZToovVofVqUymKAHoPaxCScTB7n2Tv9qLUWdtQt5zqFExp3ctLDkOl)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
