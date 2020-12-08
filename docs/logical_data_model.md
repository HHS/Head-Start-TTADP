Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLN1Rjim3BtxAtZRLg0vRBUYABfrsP1BCQJR1oWMwmYJH8sILnH9_dsMXHYAaNQ2FM2dG8_a4zyZOztw83YqHbTlGFmc9S4nRJGQ3qygR47OHgE4ckd9moDYgFnFPPrWOK0hY-7P8H27BLLLhONtyCCZmwu2k82ExGgK3TXqqFLrWnPP19GtDrruwz77t5LCye6LRJhK2eFvsMt9udrhDiWvV05eXD8v55JGU0LeMnFPoU0Q6qLsbJNnziFxTx1UVbckb_TtomTmxKQhUf4I_KB9dhfcZ5r-35rXK0Pz4CRraTR9Cv73KNhYAH5_CH8wK3pKv70A0u14NxDoGP4Tq5bolY4RvNsnfDOZ5xWTXpvupHDdvADF1MMzd_zYih_Q3bio4_iIDyZ5WoARJwXbbHyDXYt97E5qpIUIpwUmTsGzleJVaSG1docKzBdrUsrblvDJTNdDS4sgAzei9bqoxCWwp3f4-fNyMqtVnVm5-Kf2bta0q9M6rkT897naOMPFCH_9QoqrNQp0q4ZnlmnbOGCMxkBycrwyP_pqJFvYDKbGYUifCnMEbYKX73wBW2EXQEKOdRb5GJWj2Zx-a-IT6ZC8dBAUKsN6bmZs-qlQGHfMGWvqURdVPSzVrRyYP_1KTIv0-fYV_enL-jeTzZqK6w-I3yUqezjLZ8smHBTOGFpDwSv3mxy_SGr8Vka-DT8VZp9Ei5kqiZNw3m00">

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
Grantee ||--|{ Grant
Region ||--|{ Grant
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/nLN1Rjim3BtxAtZRLg0vRBUYABfrsP1BCQJR1oWMwmYJH8sILnH9_dsMXHYAaNQ2FM2dG8_a4zyZOztw83YqHbTlGFmc9S4nRJGQ3qygR47OHgE4ckd9moDYgFnFPPrWOK0hY-7P8H27BLLLhONtyCCZmwu2k82ExGgK3TXqqFLrWnPP19GtDrruwz77t5LCye6LRJhK2eFvsMt9udrhDiWvV05eXD8v55JGU0LeMnFPoU0Q6qLsbJNnziFxTx1UVbckb_TtomTmxKQhUf4I_KB9dhfcZ5r-35rXK0Pz4CRraTR9Cv73KNhYAH5_CH8wK3pKv70A0u14NxDoGP4Tq5bolY4RvNsnfDOZ5xWTXpvupHDdvADF1MMzd_zYih_Q3bio4_iIDyZ5WoARJwXbbHyDXYt97E5qpIUIpwUmTsGzleJVaSG1docKzBdrUsrblvDJTNdDS4sgAzei9bqoxCWwp3f4-fNyMqtVnVm5-Kf2bta0q9M6rkT897naOMPFCH_9QoqrNQp0q4ZnlmnbOGCMxkBycrwyP_pqJFvYDKbGYUifCnMEbYKX73wBW2EXQEKOdRb5GJWj2Zx-a-IT6ZC8dBAUKsN6bmZs-qlQGHfMGWvqURdVPSzVrRyYP_1KTIv0-fYV_enL-jeTzZqK6w-I3yUqezjLZ8smHBTOGFpDwSv3mxy_SGr8Vka-DT8VZp9Ei5kqiZNw3m00)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
