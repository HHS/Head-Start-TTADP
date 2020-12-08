Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/pLN1RXCn4BtlLymDg9GSu5PLLQ4AA9SAfV01pdgwiR0zPkobgfByExOth1oq5AlBWKiYlvbvE_FUoBxnGN3eZMvUWVX1Ie9Zsceq7XvLs86mdKO9BTEZXmV4qFXloZh1me1M5iEJGo0EEsgQLWlluQj7Xdq3S06HxHAK3TX5wEggGuii0ihhwnZUUVGfTvsIV61bkuXQOR0yknrPlElD5hc4Bm2DKBg4WWeQBm5jRn8x6TnWfyYkYoPUltlx1ZQhZwlDwkvsTG-ktshLBeT4lrGoKxUCgSlt8HO6PT07OLoEz4vEH8w_HXzuQeQ_-6tGaUA-9OSlOG2Gw5jMBiGMHdJME9-HZVA-UgJU8rUedKmVjUONUkIJJXLbMSz_uUptFc8hPc9VemQvT8WTbmxrhCgZmR0ZMI8yVEO3oQTpsBiuE_u9loM98pvpKD9Jw_VSoduXfzhwcl4pkQvkivXqZTc9TVGw9Fgr_5jDxcB-WdmYeUiq08YbeVSbaWWVM9YPBfvRybnBNOpzvuAoi04hTt6UM44uBIhlk6vegqAxOO1Hlg6oQBdUXMJa747pYtmuB6X_Ug46v4YBnM5VtF9DlYmdyA5gAa1wpC--D_aNZeSCfSQRamvZsg1sasBds8bkkOJqNz9DG-EIPwvpv0Qjx8t-2G00">

UML Source
----------

```
@startuml
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
  * createdAt : timestamp
  * updatedAt : timestamp
}

class TopicGoal {
  * id : integer
  * topicId: integer(32) REFERENCES public.Topics.id
  * goalId : integer(32) REFERENCES public.Goals.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Grantee {
  * id : integer
  * name : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Ttaplan {
  * id : integer <<generated>>
  * granteeId : integer(32) REFERENCES public.Grantees.id
  * grant : string
  * goalId : integer(32) REFERENCES public.Goals.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

User ||-o{ Region
User }o--|{ Permission
Scope }o--|{ Permission
Region }o--|{ Permission
Role }o--|{ Topic
Topic }|--|{ Goal
Grantee }o--|{ Ttaplan
Goal }o--|{ Ttaplan
Role .. RoleTopic
Topic .. RoleTopic
Topic .. TopicGoal
Goal .. TopicGoal
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/pLN1RXCn4BtlLymDg9GSu5PLLQ4AA9SAfV01pdgwiR0zPkobgfByExOth1oq5AlBWKiYlvbvE_FUoBxnGN3eZMvUWVX1Ie9Zsceq7XvLs86mdKO9BTEZXmV4qFXloZh1me1M5iEJGo0EEsgQLWlluQj7Xdq3S06HxHAK3TX5wEggGuii0ihhwnZUUVGfTvsIV61bkuXQOR0yknrPlElD5hc4Bm2DKBg4WWeQBm5jRn8x6TnWfyYkYoPUltlx1ZQhZwlDwkvsTG-ktshLBeT4lrGoKxUCgSlt8HO6PT07OLoEz4vEH8w_HXzuQeQ_-6tGaUA-9OSlOG2Gw5jMBiGMHdJME9-HZVA-UgJU8rUedKmVjUONUkIJJXLbMSz_uUptFc8hPc9VemQvT8WTbmxrhCgZmR0ZMI8yVEO3oQTpsBiuE_u9loM98pvpKD9Jw_VSoduXfzhwcl4pkQvkivXqZTc9TVGw9Fgr_5jDxcB-WdmYeUiq08YbeVSbaWWVM9YPBfvRybnBNOpzvuAoi04hTt6UM44uBIhlk6vegqAxOO1Hlg6oQBdUXMJa747pYtmuB6X_Ug46v4YBnM5VtF9DlYmdyA5gAa1wpC--D_aNZeSCfSQRamvZsg1sasBds8bkkOJqNz9DG-EIPwvpv0Qjx8t-2G00)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
