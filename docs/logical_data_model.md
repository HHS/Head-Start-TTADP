Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLL1Jzmy4BtdLypj-uh47jeRGeYMBXKNX83-06yyPAtQ7dSyAK8i_xrnBAp0BjJQLEebgppFl9dtPh8-ZQ9OUcUR_q3z8gCXCAqikWZtHjQWV6THGyjq7-4EKPhum_YWM3cmngCy10HYMLFJj5R52DyZCZms00Smi1s1yOBT01qVT-YHbQ0-EHcErn5ZYhr8GL7O-6v0lN8uVGzhydZPknNo53u0TChOAIH6B1u1-jubTd9uZPqXVp5fulzF7p_0zV9yURsyF5lUGEXNrhIB71WNHe_KBMFgyhCCYM8SHb4kZ2Tzq3jEdfwbPvuQyGUlX1QAcvO2xiC0e36sR88OyWMT9USAsPaOgoNr4Rd2xJJquZNlEQEOVAf86_ty6vFzsG_OafaurhX18RqawoQpwDbCNntAclGKuLpc2-c7bt0CWtPy2pyZZGMVAPJihlLxRsLlAPYsFgUKoNbLcyLaQuQTMCki9T5Vw3_bZ5tCNv1lf6oT1m13glHnYYJ2EtuLPk8vaxjnYYMk4ULMr9LLQQ5MH1QLdzVnAFozjhlXhCBqHF6lJ6Vb1IltTNwbD-jiNK_x_gjrML2Dwpao9sujL49OlYh1LqBHwsrqjZ5f1Ie-v7q4lhIcDYzbxRF3-tgHhZJOR0xf4V94C_94XuURnyazskJhVHlFMRiEo9RuyQjfnYSyRKOeDTvagqfO6KcJ7bjefbmi8FrEANT2kMXXAyYqS59UIZnBUO6TejUzixy1">

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
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/nLL1Jzmy4BtdLypj-uh47jeRGeYMBXKNX83-06yyPAtQ7dSyAK8i_xrnBAp0BjJQLEebgppFl9dtPh8-ZQ9OUcUR_q3z8gCXCAqikWZtHjQWV6THGyjq7-4EKPhum_YWM3cmngCy10HYMLFJj5R52DyZCZms00Smi1s1yOBT01qVT-YHbQ0-EHcErn5ZYhr8GL7O-6v0lN8uVGzhydZPknNo53u0TChOAIH6B1u1-jubTd9uZPqXVp5fulzF7p_0zV9yURsyF5lUGEXNrhIB71WNHe_KBMFgyhCCYM8SHb4kZ2Tzq3jEdfwbPvuQyGUlX1QAcvO2xiC0e36sR88OyWMT9USAsPaOgoNr4Rd2xJJquZNlEQEOVAf86_ty6vFzsG_OafaurhX18RqawoQpwDbCNntAclGKuLpc2-c7bt0CWtPy2pyZZGMVAPJihlLxRsLlAPYsFgUKoNbLcyLaQuQTMCki9T5Vw3_bZ5tCNv1lf6oT1m13glHnYYJ2EtuLPk8vaxjnYYMk4ULMr9LLQQ5MH1QLdzVnAFozjhlXhCBqHF6lJ6Vb1IltTNwbD-jiNK_x_gjrML2Dwpao9sujL49OlYh1LqBHwsrqjZ5f1Ie-v7q4lhIcDYzbxRF3-tgHhZJOR0xf4V94C_94XuURnyazskJhVHlFMRiEo9RuyQjfnYSyRKOeDTvagqfO6KcJ7bjefbmi8FrEANT2kMXXAyYqS59UIZnBUO6TejUzixy1)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
