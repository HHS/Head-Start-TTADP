Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLVRRkCs47tNL_2jRO04HOkYm29Ox6xgBV9GDqYo7p2M9Z9RaiCEHzaQIVwzeeaGeksaNAkNbyGwSpyy5AbtGO1biAO9BHXKtvxz-4FJVANWddIdFDFAe0tgivQr0jSRx5JBz3ceEqHfmk_QUM2mocY7il6eY6LDJTCQ245z2iZgeL7gH8tPtYZj1FiHEZ_lqI63OFVsxMXU1mpHzp8w1M7j-X5rO77wxDVaS3dO5V8KFb5eGPif95eClb7e1XkpayLhx3MvoqaJNt__tJVgUl5nSRrONYnkb1zMHhTdoJ6SwMwRkcMCNRwNCL2qnI1W_TOo-Ew0vUbvz9IdPlYJdK5pYfkMF1wJGQaEGylQYoQNqLdZN25R7KBrI4D0hc0xBdhccezSen1vgWZRylbFhEmVmuWjc8b33HlauuCcDrsXWVNqqQAigL0_fp8VgDkKSF3a0hw4Nr276PyvA9b3ydjDihVaTLiVaykak2fbCPcQnOvPyrfBJ7_P_LtCjelv0lcPmDHne5GGa25CaPZmZdVSTFZ8P6yii8GrejmAN1c8WbeH6GGtg-EqRA-rtO-s2j9ZYl-BT0OdMAdN-PLUhBDtF1txLklJG3Mi9yyKk2UeYB3y188xWwBhzj3vn4G9L6paOmOigQcDYr77Q7WU5qjogUjZ3l1vfT-tek-rRAxH4qjDUSP00xVRErXn1a7NwNXmWLcIOA6g9FHVxww0HRVQHwQBlT2XqVV8cr_sJhPkoCTXXwssO0ernk6oR0i8ycHZGOrERZSU3voPk_V3_JtXcNe66-CZ3iomEK_MI8W0zoXNv0UpxVIG3oC4SWSClc1arvnUYmSD0ccUFKjBJl1FAGQ07cyaiVDR83T25jm8ShbIHr_630Jvb8JsOVClt-IUmsPBVYB6kcq7nLwfQBZSNAdnBteTfH2NNmyLSSliF9keilqBCWPMn234_nLVNoh863As7t-gnyTJUb19CmbvejFJnuV9rqcJFfhsyHHro40c-s_l8aswZ3uzRg5u73I9_koM3xec_jb3KygpCnN_JrCUX5BHd2qZHU5nybpYUPG2AtcEILvUwaJTgou5uONRRgd2fzY1gVbeFspEiiQNVTwXwmPh_W80">

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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/png/nLVRRkCs47tNL_2jRO04HOkYm29Ox6xgBV9GDqYo7p2M9Z9RaiCEHzaQIVwzeeaGeksaNAkNbyGwSpyy5AbtGO1biAO9BHXKtvxz-4FJVANWddIdFDFAe0tgivQr0jSRx5JBz3ceEqHfmk_QUM2mocY7il6eY6LDJTCQ245z2iZgeL7gH8tPtYZj1FiHEZ_lqI63OFVsxMXU1mpHzp8w1M7j-X5rO77wxDVaS3dO5V8KFb5eGPif95eClb7e1XkpayLhx3MvoqaJNt__tJVgUl5nSRrONYnkb1zMHhTdoJ6SwMwRkcMCNRwNCL2qnI1W_TOo-Ew0vUbvz9IdPlYJdK5pYfkMF1wJGQaEGylQYoQNqLdZN25R7KBrI4D0hc0xBdhccezSen1vgWZRylbFhEmVmuWjc8b33HlauuCcDrsXWVNqqQAigL0_fp8VgDkKSF3a0hw4Nr276PyvA9b3ydjDihVaTLiVaykak2fbCPcQnOvPyrfBJ7_P_LtCjelv0lcPmDHne5GGa25CaPZmZdVSTFZ8P6yii8GrejmAN1c8WbeH6GGtg-EqRA-rtO-s2j9ZYl-BT0OdMAdN-PLUhBDtF1txLklJG3Mi9yyKk2UeYB3y188xWwBhzj3vn4G9L6paOmOigQcDYr77Q7WU5qjogUjZ3l1vfT-tek-rRAxH4qjDUSP00xVRErXn1a7NwNXmWLcIOA6g9FHVxww0HRVQHwQBlT2XqVV8cr_sJhPkoCTXXwssO0ernk6oR0i8ycHZGOrERZSU3voPk_V3_JtXcNe66-CZ3iomEK_MI8W0zoXNv0UpxVIG3oC4SWSClc1arvnUYmSD0ccUFKjBJl1FAGQ07cyaiVDR83T25jm8ShbIHr_630Jvb8JsOVClt-IUmsPBVYB6kcq7nLwfQBZSNAdnBteTfH2NNmyLSSliF9keilqBCWPMn234_nLVNoh863As7t-gnyTJUb19CmbvejFJnuV9rqcJFfhsyHHro40c-s_l8aswZ3uzRg5u73I9_koM3xec_jb3KygpCnN_JrCUX5BHd2qZHU5nybpYUPG2AtcEILvUwaJTgou5uONRRgd2fzY1gVbeFspEiiQNVTwXwmPh_W80)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
