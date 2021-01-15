Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLRRRkCs47tNL_2jxG8nYXP5WKMms4kzHHxg6dRo0RGuaTcI77OuIc34-VUQ8YABiP8oLe5ziQ4pzyF3oyV0ahYrfWgrD21-dFtwIrLz9-GTQYKyuSQ03U9UyrP8rnXGeYQy3-8MWAlmjtPUahJ2Q0Uyyo2GU8jLLHiPWhW9GEAX4kATq4gy5zenD0Veyh811oGPr8SF1_CsG8Y-Lz4fC6dN750dBGo__HOTB5gx0Jh2CJTOgSqGOiq6tWjmhOtPqS8A6etkQj34zp__z8DOpR_EL_F5b_bQ-7PZT3rBZc6cLPUw9eXTVk9386iBWQNrdQNrQiJo-3HwobCo_Bjyq6EATOqUpiaWX89Ga_QiqVNef76MG5Q7K3nI6u0As8wBtdDDPwvHY3mLX7Ly_Xyh-qzxmEP4IA643VJnGwCRhb1BUlXfWRUOgPzIcS-eTZaSFBe0B-5VK46FJnmKpPZyNfFiDNfTbyVqPL9SaR883PHe1CrnhJcclrB_5TDrCLqWlwCqPHm84LXo6uP8J7XBpznq-4ferrOIXoq0NxDS6Xa5jK4q8DsaZjEolTPsSx0La1vJV2lIIJg6GhrEh_HYdPFhwTnJhKa3bR2UF5FWYQ0YGloRP7WsA3XrYauc9agWO2EVCs1EJMbSYZfBmnEuMA1BNPzvWKye_QbcVQTvjmAFn2Nb2GAsL7TliEmEaahfU759iq26J5L9w7_UBYMnhhMFJ6TxGO7HTq2xFqvkDjNsrw62MbjfCZN6uJBPzf0_rhhUUHYvBP-_34ztWoTiIDeO7t5997UNoHgfO4aDy19zQxeUntm8P41tOiZw6ubB1-AeWMMQPoHZ0sjE9FmLq9tzjZ8oy4tIpUVTMuCdIt4WahBj83CD5_IRYpur_gPZ8eMuVjiMn1tt-0IY8j5Ylx_01v4kW8GyuiN5_c7mxAwwr-i8dgB636Xw_-wIhT8hwt7VGV6SgrB_lLj_WbVnvmHDAMSp4V-7AKUXLFIOBKTIuJXvN-9fb0mR4fGlSfL_PZwPv5AnQ1yt7zVnPP-Fu5HhpRy0">

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
  participantType : string
  requester : string
  * status : string
  programTypes : array<string>
  targetPopulations : array<string>
  reason : array<string>
  participants : array<string>
  topics : array<string>
  ttaType : array<string>
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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/nLRRRkCs47tNL_2jxG8nYXP5WKMms4kzHHxg6dRo0RGuaTcI77OuIc34-VUQ8YABiP8oLe5ziQ4pzyF3oyV0ahYrfWgrD21-dFtwIrLz9-GTQYKyuSQ03U9UyrP8rnXGeYQy3-8MWAlmjtPUahJ2Q0Uyyo2GU8jLLHiPWhW9GEAX4kATq4gy5zenD0Veyh811oGPr8SF1_CsG8Y-Lz4fC6dN750dBGo__HOTB5gx0Jh2CJTOgSqGOiq6tWjmhOtPqS8A6etkQj34zp__z8DOpR_EL_F5b_bQ-7PZT3rBZc6cLPUw9eXTVk9386iBWQNrdQNrQiJo-3HwobCo_Bjyq6EATOqUpiaWX89Ga_QiqVNef76MG5Q7K3nI6u0As8wBtdDDPwvHY3mLX7Ly_Xyh-qzxmEP4IA643VJnGwCRhb1BUlXfWRUOgPzIcS-eTZaSFBe0B-5VK46FJnmKpPZyNfFiDNfTbyVqPL9SaR883PHe1CrnhJcclrB_5TDrCLqWlwCqPHm84LXo6uP8J7XBpznq-4ferrOIXoq0NxDS6Xa5jK4q8DsaZjEolTPsSx0La1vJV2lIIJg6GhrEh_HYdPFhwTnJhKa3bR2UF5FWYQ0YGloRP7WsA3XrYauc9agWO2EVCs1EJMbSYZfBmnEuMA1BNPzvWKye_QbcVQTvjmAFn2Nb2GAsL7TliEmEaahfU759iq26J5L9w7_UBYMnhhMFJ6TxGO7HTq2xFqvkDjNsrw62MbjfCZN6uJBPzf0_rhhUUHYvBP-_34ztWoTiIDeO7t5997UNoHgfO4aDy19zQxeUntm8P41tOiZw6ubB1-AeWMMQPoHZ0sjE9FmLq9tzjZ8oy4tIpUVTMuCdIt4WahBj83CD5_IRYpur_gPZ8eMuVjiMn1tt-0IY8j5Ylx_01v4kW8GyuiN5_c7mxAwwr-i8dgB636Xw_-wIhT8hwt7VGV6SgrB_lLj_WbVnvmHDAMSp4V-7AKUXLFIOBKTIuJXvN-9fb0mR4fGlSfL_PZwPv5AnQ1yt7zVnPP-Fu5HhpRy0)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
