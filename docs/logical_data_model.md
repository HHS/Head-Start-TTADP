Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/nLTjR-Gq4FwUN-5lm4bT8H12EbMdkojxg18iLTlx0RF9D6jmF6OywR5g-z-9unB5cspFjn7mfLMUUN_yE9DzwmLOsiOKlWI3wjlLZpyKnLSAxabNoZ5j3JPUVTAoKs1hWvKgcJvvTOSeXVz3MmSCZJBQekmTAcBPKL6K1hnN7psoUYYKUgMwRA-Lje9r1vsVrsYHGR1wywOpxppwu7iPdBomjdM7McXm_EnsP77JDblaCVnAOGFQZ27HOl2rGjis8JirU8sr9divQkBhxx_xHbslFwolrvkBzOroxTReSXKT_KfNVMe3NdwXMjikK7I3Ng1nlQLa3Fs_aucbTTMCvUaVKcA575fU7L0mfBWfoU4f6PIgq9UidMYo0xfed2laHdkVFLBhaJFE8SXXE0K-yVHyu2aZhESpH2qzsJ_R3bip4_iSDiY51qrsV48jw_5ZWxAZv5vmBFEUgdqAUqVMup7yWYeSy8M3afcJtqkIlIMdo_oOeKoCor8Mayavx91rE6i9wI-hpyNqNImNoCy49ey3fRo0j7wCX8HtVE2c_GUcvgO15hz3b5k1AmD1K5iYWs2NTTmF_bBRTMVB83sa-Bz8Px22cNfTNkbedSdYElMjLiU1SbYFdZ5mAgX-z_y4WWU3egscw69YWWGoBl8f0wRKvCQ5g1Crl82B3TdOzOaBV47fTwNeUotxQtJ4abEUqLFBPVzrbkmWg2eT5XUO3Gacgef2_-tk2bXqgLrWEhaB5HfzZxp_TRBPgdPOXnMMkW6Jg34CDyWsWM2Oh2keqShjtk7CpZpySfpU2STKCpGXFk303FlpQ0s4272DSaMkDNsdSpwCuCdE65pAo84vlXPd3G9ndecb92luboG3G8qt4jdvtPFje0Pi1t9wKYT_Z1dmyZ4AxVt-N_wIUmvRBlcH6FEk7IHt9QFXz7B5nh_eTHH3xF1wo8ZR3CxBYKhQlo1ZO4iCGlmVylL5WWmXy-tdhvgbRP-mGPxR3XEenySpUb1HwX5vehEpnuVHZweY_jQRuZ5gpa1cyEy_eOh-htfwxA7GGn5LCxWD-xa8VoPeJBbQgV1_d78MYaM7R0T8B1mc7qeyZv9YASyXoN65HkfUTlbSlgJVOwP8uO4vESi3K_gO-2JlfCXBiC-RXukEnttUegtQnlmD" alt="logical data model diagram">

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
  * lastLogin : timestamp
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
  managerNotes : string
  * userId : integer(32) REFERENCES public.Users.id
  * lastUpdatedById : integer(32) REFERENCES public.Users.id
  * regionId : integer(32) REFERENCES public.Region.id
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

class ActivityReportCollaborator {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * userId : integer(32) REFERENCES public.User.id
}

class ActivityReportGoal {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * goalId : integer(32) REFERENCES public.Goal.id
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
ActivityReport .. ActivityReportCollaborator
User .. ActivityReportCollaborator
ActivityReport .. ActivityReportGoal
Goal .. ActivityReportGoal
Goal }|--|{ ActivityReport

User ||-o{ ActivityReport
ActivityReport ||-o{ ActivityParticipant
Grant ||-{ ActivityParticipant
NonGrantee ||-{ ActivityParticipant
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/nLTjR-Gq4FwUN-5lm4bT8H12EbMdkojxg18iLTlx0RF9D6jmF6OywR5g-z-9unB5cspFjn7mfLMUUN_yE9DzwmLOsiOKlWI3wjlLZpyKnLSAxabNoZ5j3JPUVTAoKs1hWvKgcJvvTOSeXVz3MmSCZJBQekmTAcBPKL6K1hnN7psoUYYKUgMwRA-Lje9r1vsVrsYHGR1wywOpxppwu7iPdBomjdM7McXm_EnsP77JDblaCVnAOGFQZ27HOl2rGjis8JirU8sr9divQkBhxx_xHbslFwolrvkBzOroxTReSXKT_KfNVMe3NdwXMjikK7I3Ng1nlQLa3Fs_aucbTTMCvUaVKcA575fU7L0mfBWfoU4f6PIgq9UidMYo0xfed2laHdkVFLBhaJFE8SXXE0K-yVHyu2aZhESpH2qzsJ_R3bip4_iSDiY51qrsV48jw_5ZWxAZv5vmBFEUgdqAUqVMup7yWYeSy8M3afcJtqkIlIMdo_oOeKoCor8Mayavx91rE6i9wI-hpyNqNImNoCy49ey3fRo0j7wCX8HtVE2c_GUcvgO15hz3b5k1AmD1K5iYWs2NTTmF_bBRTMVB83sa-Bz8Px22cNfTNkbedSdYElMjLiU1SbYFdZ5mAgX-z_y4WWU3egscw69YWWGoBl8f0wRKvCQ5g1Crl82B3TdOzOaBV47fTwNeUotxQtJ4abEUqLFBPVzrbkmWg2eT5XUO3Gacgef2_-tk2bXqgLrWEhaB5HfzZxp_TRBPgdPOXnMMkW6Jg34CDyWsWM2Oh2keqShjtk7CpZpySfpU2STKCpGXFk303FlpQ0s4272DSaMkDNsdSpwCuCdE65pAo84vlXPd3G9ndecb92luboG3G8qt4jdvtPFje0Pi1t9wKYT_Z1dmyZ4AxVt-N_wIUmvRBlcH6FEk7IHt9QFXz7B5nh_eTHH3xF1wo8ZR3CxBYKhQlo1ZO4iCGlmVylL5WWmXy-tdhvgbRP-mGPxR3XEenySpUb1HwX5vehEpnuVHZweY_jQRuZ5gpa1cyEy_eOh-htfwxA7GGn5LCxWD-xa8VoPeJBbQgV1_d78MYaM7R0T8B1mc7qeyZv9YASyXoN65HkfUTlbSlgJVOwP8uO4vESi3K_gO-2JlfCXBiC-RXukEnttUegtQnlmD)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
