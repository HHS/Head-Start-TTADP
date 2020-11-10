Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/ROynJWGn34NxdC8TqXu1hLPBIKF70RoRpoGYTYBRmmWXxaw6Qeej_TxNb__LWorMQUc9-AlNJCFwhK6SjXg5M9U6J7VhczC74Ca_gmus5cfL4Ty3r2rAJ-dUs9tU7KO_YUX4i-sPgWQMYSxd1GhZGBvSfYuEtxElUyZ3gYwJAWkEzoXTyRRA3NR44Axj24xpHUpTBp5nL847o_WtwyWFp6-wGlDS_WS0" alt="logical data model diagram">

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

User ||-o{ Region
User }o--|{ Permission
Scope }o--|{ Permission
Region }o--|{ Permission
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/ROynJWGn34NxdC8TqXu1hLPBIKF70RoRpoGYTYBRmmWXxaw6Qeej_TxNb__LWorMQUc9-AlNJCFwhK6SjXg5M9U6J7VhczC74Ca_gmus5cfL4Ty3r2rAJ-dUs9tU7KO_YUX4i-sPgWQMYSxd1GhZGBvSfYuEtxElUyZ3gYwJAWkEzoXTyRRA3NR44Axj24xpHUpTBp5nL847o_WtwyWFp6-wGlDS_WS0)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
