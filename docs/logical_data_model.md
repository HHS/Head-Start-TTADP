Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLRRRkCs47tNL_2jRO0OHOkYm29OxANU8WzrWoJx0HDn8hCbEUnmbAqHvzzhYbX2yYfRnYhG5niwSpyylBo90YoziqrimQBwVlNpJqtpZO87Cbe5fZkBBgfFHhOAV6THgvRfKrJtYDB4FuqFmE2KDHvb5r0HovQQfhKGe_eOaTLZezIPCbgzKiOBTWVeug93Zmo2-lNhWtaRCIRVo-GKXOtl3gW7X-Fli2MFczxT8O_XCuKEZ1r3OiJYAuM-ToaxERp6pf2_73NnxOy_VAUkrn_Mr-lD-_MD2lsTDUqgEyQLqKFgbZ5r-LOEWM8SHW4N1aiVz8pbwVFeEK_Dy6T7WvOKDoq5F2M3KXfZooQ88L_GHUDS8JiJO_L8VKIkO3ijUk6QJroZc7Yg21lu_2zMzgyUewoPYMCD6nJIXo4_Ng6UpVZJeMnfedxEPTwHtatX6CX7V0v_JneBld1GidFo-vfaRocOjZwcbCbnLSfYiZMBdRAMjPQK_bB_MypGnNA1_4fWwpXGAWf87yT8IdZFHsucVc1oDmvOuXPHRWMkB2H1tH5P1B-ius7mhxNT7MmLfASK_nVf35wmKg_BAprRv_XwElbKw_90DQndpnGu8wY4iFm2WaU3ejSpw59YaWHgDl890qwfgOrBKQTeU1aN6_AvwrCky6MbtxPY7epihZ4GIqrvnaWzjyCRR787WTOcNLnWDoGuKLKM-k_tLy1YMXCIqvEzeD6Q1-JTRr_SRBelrw76rZYm4pMcuOfi9n2KoGu53NgvtGMSkJEFteSpUo8mTGmknISSc65taQs9407kKAuez7ReTCw74IBv6KEOCd9apiVYh44WzJDZQSaB_YsJ0Q336ydi_179d_peiX3bOnRKkzqBWvThTAIUkdq24t5Nz3lT3Rdn5vqVESIN_LmHjodE2uXAHAlz_fmULRuPCl94v-Vxnz5xl1cUjJDuZfepa2t-m-tR3B_gQJz0wG1iSl_5hHpjJVhv0iqfLokL_aSfvw5Sj6GhoBXmchoK-3pA11iJD5taPlgPVUOabuib-xovh2C-x_C6lUwT_GS0">

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

User ||-o{ ActivityReport
ActivityReport ||-o{ ActivityParticipant
Grant ||-{ ActivityParticipant
NonGrantee ||-{ ActivityParticipant
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/nLRRRkCs47tNL_2jRO0OHOkYm29OxANU8WzrWoJx0HDn8hCbEUnmbAqHvzzhYbX2yYfRnYhG5niwSpyylBo90YoziqrimQBwVlNpJqtpZO87Cbe5fZkBBgfFHhOAV6THgvRfKrJtYDB4FuqFmE2KDHvb5r0HovQQfhKGe_eOaTLZezIPCbgzKiOBTWVeug93Zmo2-lNhWtaRCIRVo-GKXOtl3gW7X-Fli2MFczxT8O_XCuKEZ1r3OiJYAuM-ToaxERp6pf2_73NnxOy_VAUkrn_Mr-lD-_MD2lsTDUqgEyQLqKFgbZ5r-LOEWM8SHW4N1aiVz8pbwVFeEK_Dy6T7WvOKDoq5F2M3KXfZooQ88L_GHUDS8JiJO_L8VKIkO3ijUk6QJroZc7Yg21lu_2zMzgyUewoPYMCD6nJIXo4_Ng6UpVZJeMnfedxEPTwHtatX6CX7V0v_JneBld1GidFo-vfaRocOjZwcbCbnLSfYiZMBdRAMjPQK_bB_MypGnNA1_4fWwpXGAWf87yT8IdZFHsucVc1oDmvOuXPHRWMkB2H1tH5P1B-ius7mhxNT7MmLfASK_nVf35wmKg_BAprRv_XwElbKw_90DQndpnGu8wY4iFm2WaU3ejSpw59YaWHgDl890qwfgOrBKQTeU1aN6_AvwrCky6MbtxPY7epihZ4GIqrvnaWzjyCRR787WTOcNLnWDoGuKLKM-k_tLy1YMXCIqvEzeD6Q1-JTRr_SRBelrw76rZYm4pMcuOfi9n2KoGu53NgvtGMSkJEFteSpUo8mTGmknISSc65taQs9407kKAuez7ReTCw74IBv6KEOCd9apiVYh44WzJDZQSaB_YsJ0Q336ydi_179d_peiX3bOnRKkzqBWvThTAIUkdq24t5Nz3lT3Rdn5vqVESIN_LmHjodE2uXAHAlz_fmULRuPCl94v-Vxnz5xl1cUjJDuZfepa2t-m-tR3B_gQJz0wG1iSl_5hHpjJVhv0iqfLokL_aSfvw5Sj6GhoBXmchoK-3pA11iJD5taPlgPVUOabuib-xovh2C-x_C6lUwT_GS0)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
