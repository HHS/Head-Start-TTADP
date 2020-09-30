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
  email : string
  * createdAt : timestamp
  * updatedAt : timestamp
}
@enduml
```

[Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/RSmnQZGn30NWtgTGzyCFUu6mB9ioJReSm3j-6OjOif4qMPQGkyUJQeeqXlSzwrqziiKcBVsZoWKK5UIZH_fD2zlICBlysRdGi7vh4ASxHwMiQqEXnVhTwHs8v1-i8riMQgo8nm1rYzfJWWR7WzuSHb-9w3_DkITY3QoJpkSL2ik1ShdC-dIQJtNuVl2o__GmrdMgPi4nZzeLhvlSO4U6P6v7M0px_7DC31PuP1dJjr7-yEzqXPPDsWy0)
