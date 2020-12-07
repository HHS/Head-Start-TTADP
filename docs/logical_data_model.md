Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/rLN1RXCn4BtlLymDg9GUu1PLLQ4AA9SAfV01pdgwQs5xpDXBLINvT-mrMRab5AlBXQFVpBoTUM_Mll91S1YCRbw1-45AWcFQQZGUxbNeGTXEeuIMwTx37M9e_3TbdM1XG2kBuS4X48UUcgRLmdluwf5Xrm2SGMHRWh81kmXTN7HeaKL0UNaPmxr7dtBNASa7LhQBg1K6oxFhoUBDOBR89Nm6Q8JI9HHKqBW4j8D9x6HmWvqYkowQUFtkxHlOh3wkDgkRwzKjk66hLNkU4_svaYDrovYwV1zW6LaDHecC6oE3aoSYX-FecQTc-BCdWquKjoqvV0a3W4JVid8XjZ2XiyRvZ6oKzzKZ3HwvGkra-gGrlz0ZdtIgA1lr_1VEVXyYjc8czZLga4k795tXnS2gF1eCFSaIuVoP3oGV7iFUnTdnJ_WrIPpmcOEIFhL-pwti5tAghQ-PFfFhgZQBITUOdLWdhqEYNyk_rOnTp5-GJoHqdGO0iJGClaGIuHqBCzl5qfBdMleF16LX0rRkuZonWd1QLDvnNMwhGhiym2HVhdpSSaT2rp35j3c2ZY_oVh-WtQyNAYC7MYpsk-AMR_BZypkUgqu5I1_pyyur-QS-x4SeDTva7OvfHxMR57kANQ6LWz4_0G00" alt="logical data model diagram">

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
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/rLN1RXCn4BtlLymDg9GUu1PLLQ4AA9SAfV01pdgwQs5xpDXBLINvT-mrMRab5AlBXQFVpBoTUM_Mll91S1YCRbw1-45AWcFQQZGUxbNeGTXEeuIMwTx37M9e_3TbdM1XG2kBuS4X48UUcgRLmdluwf5Xrm2SGMHRWh81kmXTN7HeaKL0UNaPmxr7dtBNASa7LhQBg1K6oxFhoUBDOBR89Nm6Q8JI9HHKqBW4j8D9x6HmWvqYkowQUFtkxHlOh3wkDgkRwzKjk66hLNkU4_svaYDrovYwV1zW6LaDHecC6oE3aoSYX-FecQTc-BCdWquKjoqvV0a3W4JVid8XjZ2XiyRvZ6oKzzKZ3HwvGkra-gGrlz0ZdtIgA1lr_1VEVXyYjc8czZLga4k795tXnS2gF1eCFSaIuVoP3oGV7iFUnTdnJ_WrIPpmcOEIFhL-pwti5tAghQ-PFfFhgZQBITUOdLWdhqEYNyk_rOnTp5-GJoHqdGO0iJGClaGIuHqBCzl5qfBdMleF16LX0rRkuZonWd1QLDvnNMwhGhiym2HVhdpSSaT2rp35j3c2ZY_oVh-WtQyNAYC7MYpsk-AMR_BZypkUgqu5I1_pyyur-QS-x4SeDTva7OvfHxMR57kANQ6LWz4_0G00)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
