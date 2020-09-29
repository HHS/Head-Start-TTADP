Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/RSmnQZGn30NWtgTGzyCFUu6mB9ioJReSm3j-6OjOif4qMPQGkyUJQeeqXlSzwrqziiKcBVsZoWKK5UIZH_fD2zlICBlysRdGi7vh4ASxHwMiQqEXnVhTwHs8v1-i8riMQgo8nm1rYzfJWWR7WzuSHb-9w3_DkITY3QoJpkSL2ik1ShdC-dIQJtNuVl2o__GmrdMgPi4nZzeLhvlSO4U6P6v7M0px_7DC31PuP1dJjr7-yEzqXPPDsWy0" alt="logical data model diagram">

```
@startuml
' hide the spot
hide circle
' avoid problems with angled crows feet
skinparam linetype ortho

entity User {
  * id : integer <<generated>>
  --
  hsesUserId : string
  name : string
  phoneNumber : string
  email : string
  createdAt : timestamp
  updatedAt : timestamp
}
@enduml
```

[Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/RSmnQZGn30NWtgTGzyCFUu6mB9ioJReSm3j-6OjOif4qMPQGkyUJQeeqXlSzwrqziiKcBVsZoWKK5UIZH_fD2zlICBlysRdGi7vh4ASxHwMiQqEXnVhTwHs8v1-i8riMQgo8nm1rYzfJWWR7WzuSHb-9w3_DkITY3QoJpkSL2ik1ShdC-dIQJtNuVl2o__GmrdMgPi4nZzeLhvlSO4U6P6v7M0px_7DC31PuP1dJjr7-yEzqXPPDsWy0)
