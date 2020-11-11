Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/hPBFQXH14CRlynHrKnSs1xs54A9XX5o2RF01UgVBcSBkhhQgsX1sy-xE7zGEh31aFTQl_an_tpStQawinD2y0VUJoKCMtWUC2eza0xZK1_JG2JygV4EqHhzJoavSX409xIaZiDZ0JTC5fmfV5GKE3S06oCCbK3BiHtHrrMD2SOR--dfi3uewpTvDGsf2gHzfSX7hEW-SyBx4FKgDDu3HKQYHaGMy14mbJjSvuWvxudHNFUBjX_VlODT-RdVj_Mtx0Bdi0tKNow1Ua9zFTuBJAp_Qk6WKKSt5F7TAzYSwpx-bBtVMYD-y5Fhtn4F76Lzp0S2ZTaBPY5D5pv3p1IMIwcf9HL5Mk3s5_iThUML6ElcqOctsytya-wECh1LXqJLkS9uAubGdL8JgCg8Dx6iYosS-iNzwYJLpKlmNlsMFS6xcKonmF6xv08lN2tdcxVPugFw5PhRq15-sJZHkCFaImoy0" alt="logical data model diagram">

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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/hPBFQXH14CRlynHrKnSs1xs54A9XX5o2RF01UgVBcSBkhhQgsX1sy-xE7zGEh31aFTQl_an_tpStQawinD2y0VUJoKCMtWUC2eza0xZK1_JG2JygV4EqHhzJoavSX409xIaZiDZ0JTC5fmfV5GKE3S06oCCbK3BiHtHrrMD2SOR--dfi3uewpTvDGsf2gHzfSX7hEW-SyBx4FKgDDu3HKQYHaGMy14mbJjSvuWvxudHNFUBjX_VlODT-RdVj_Mtx0Bdi0tKNow1Ua9zFTuBJAp_Qk6WKKSt5F7TAzYSwpx-bBtVMYD-y5Fhtn4F76Lzp0S2ZTaBPY5D5pv3p1IMIwcf9HL5Mk3s5_iThUML6ElcqOctsytya-wECh1LXqJLkS9uAubGdL8JgCg8Dx6iYosS-iNzwYJLpKlmNlsMFS6xcKonmF6xv08lN2tdcxVPugFw5PhRq15-sJZHkCFaImoy0)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
