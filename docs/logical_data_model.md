Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/pLXVRzis47_Nf-3R_c09XWtRGn4KJLEt2DOcGPn-05gyoEme7dSyfJMIVFU5FbWH8pbHR2_hYmtzxl-V8qzw4raJDxKhOgaTg5_t__oZA7vG-WgjKO5mvg2EwglbkTA-Sc1KIVWrgai0BkBVrWTDkbREUk1508N4SooAqkaOrUS8fAuBfNvMrgXNodg62aWT75JWWJI3UVrwIPv7Y8dxEB559kkh3FUwXYubuOSDpv4iMuXt94sa5mV2a7G-b0Xpz73Ir3EWBWorjguBi6K7hnJufavsi8Ppg2pwuqu0F_x-sq_gVF9-SZuvEPfCLMXcpfRxmXZthLdwxdJaZrXPVoV8jeR8kWvBIacGOZ_a7gK9Pe1okqgeM1YNqZm1hOffYG4sqQ2KWLYI3MpHj-XMuPm1rJR6qI4r4MX47LB3j5MW3QiNKvv6Y2tpALBRLVQV1Y9FY93Yc6nWI0yMVRT23TdkOmqynsoYICoyHRF8uHZGHrY77w615jyoK7H3xVTOorvWiELucTQCo8tgB48tfjX9QrjhJkgFpLCoIo-sRv0FgDsu72WLMNCJkqXIU4aFs6nyJrXFQqqSvm1ymVhCwTHGCqG7sc_biPJjCRShr6v4qfEA_odf9_2DfmpXVYBp27J9zihouXm24Z_jrc76ltBF8qEdB09SB08CJzpQ6DOSBAKD5ZoFRHwbQ2MIVDZHs7yW_OWBlMjvqrExTNsCw8fNX7j3an3YTvhXGR3WpG1Q6hkZoP5aoUICEBms2xfDMKLwb6HoIgGsdDtDyt7ASw29PykB3JQNxMpd8pl6l8DAbujZqx4_EVhurz4vH6oeN2wqPcXZHT_dwxDfOonRzDgT84FMi397fvTdcjYMDgI2PQDcmDaheCMdtc9WcdQRC53QMhkiqLEAiebeeVO8p0wD_igHptSWh4ZNYNTeUMTD5V0PXiOjlHhYkRB4ZNRlG4BgczKH_O1Sw2QdHvOBPeXGecVunbaKke8fIpg-H4nJZyvyqluEfxmwibCsCzbt_RHts9JQbIbQC4Bha9YrH9Vx9DOEGo2ykdiMiy_TZpVOgPsE_5c6vktYFrx7HMnduol96lbIshlTrVEkzmqotBs9kdEDlAlZx7Js1PANC285pplcnNUsxEvz_KMwzonrg06JuH9b1ksWpfsZx-MA_BmxL4Jm_auR8TYv0NSy4aVed9uXQSRlUIpMkPywxwNStc0YrhdTZk6B-euhgoCqj1vkqM-fTkhcPW-lbHpdWjpYtjxDTUVhJo4VfVguI0qHqAtuvJspMFwgsvibbB9Vj1l9Yh5TgulqqqD5wVw-IlzTfOEGc6srjKXkEaNV6bc5as5vfPAQzVCfwNkSfQ-lVObzofPa8OCa0BnUSuyMmx2azaObTzliz4q9IKhsW2maQPss4uirCoJcdi6OapjzsYFbZnbFTjSKgPXB-Z2vStwlPte3tZIr-nS0" alt="logical data model diagram">

UML Source
----------

```
@startuml
scale 0.65

' avoid problems with angled crows feet
skinparam linetype ortho

class User {
  * id : integer <<generated>>
  * hsesUserId : string
  * hsesUsername : string
  hsesAuthorities : array<string>
  name : string
  phoneNumber : string
  email : string
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

class NextSteps {
  * id: integer
  * activityReportId: integer(32) REFERENCES public.ActivityReport.id
  * note: string
  * noteType: string
  * createdAt: timestamp
  * updatedAt: timestamp
}

class Recipient {
  * id : integer
  * name : string
    recipientType : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Grant {
  * id : integer
  * number : string
  regionId : integer(32) REFERENCES public.Regions.id
  * recipientId : integer(32) REFERENCES public.Recipient.id
  status : string
  startDate : timestamp
  endDate : timestamp
  cdi : boolean
  * createdAt : timestamp
  * updatedAt : timestamp
}

class GrantGoal {
  * id : integer <<generated>>
  * recipientId : integer(32) REFERENCES public.Recipients.id
  * grantId : integer(32) REFERENCES public.Grants.id
  * goalId : integer(32) REFERENCES public.Goals.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class OtherEntity {
  * id : integer <<generated>>
  * name : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityReport {
  * id : integer <<generated>>
  legacyId: string
  ECLKCResourcesUsed : array<string>
  nonECLKCResourcesUsed: array<string>
  additionalNotes : string
  numberOfParticipants : integer
  deliveryMethod : string
  duration : decimal
  endDate : date
  startDate : date
  activityRecipientType : string
  requester : string
  programTypes : array<string>
  targetPopulations : array<string>
  virtualDeliveryType : string
  reason : array<string>
  participants : array<string>
  topics : array<string>
  context : string
  pageState : json
  oldManagerNotes : string
  * submissionStatus : string
  calculatedStatus: string
  ttaType : array<string>
  oldApprovingManagerId : integer(32) REFERENCES public.Users.id
  * userId : integer(32) REFERENCES public.Users.id
  lastUpdatedById : integer(32) REFERENCES public.Users.id
  * regionId : integer(32) REFERENCES public.Region.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityReportApprover {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * userId : integer(32) REFERENCES public.User.id
  status: string
  note : string
  * createdAt : timestamp
  * updatedAt : timestamp
}

class Objective {
  * id : integer <<generated>>
  * goalId : integer(32) REFERENCES public.Goal.id
  title : string,
  ttaProvided : string,
  status : string,
  * createdAt : timestamp
  * updatedAt : timestamp
}

class ActivityParticipant {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  grantId : integer(32) REFERENCES public.Grant.id
  otherEntityId : integer(32) REFERENCES public.OtherEntity.id
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

class ActivityReportObjective {
  * id : integer <<generated>>
  * activityReportId : integer(32) REFERENCES public.ActivityReport.id
  * objectiveId : integer(32) REFERENCES public.Objective.id
  * createdAt : timestamp
  * updatedAt : timestamp
}

User ||-o{ Region
User }o--|{ Permission
Scope }o--|{ Permission
Region }o--|{ Permission
Role }o--|{ Topic
Topic }|--|{ Goal
Recipient }o--|{ GrantGoal
Goal }o--|{ GrantGoal
Role .. RoleTopic
Topic .. RoleTopic
Topic .. TopicGoal
Goal .. TopicGoal
Recipient ||--|{ Grant
Region ||--|{ Grant
ActivityReport .. ActivityReportCollaborator
User .. ActivityReportCollaborator
ActivityReport .. NextSteps
ActivityReport .. ActivityReportGoal
ActivityReport ||--o{ ActivityReportApprover
ActivityReportApprover }o--|| User
Goal .. ActivityReportGoal
Goal }|--|{ ActivityReport
Goal ||-o{ Objective
ActivityReportObjective }o--|{ Objective
ActivityReportObjective }o--|{ ActivityReport

User ||-o{ ActivityReport
ActivityReport ||-o{ ActivityParticipant
Grant ||-{ ActivityParticipant
OtherEntity ||-{ ActivityParticipant
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/pLXVRzis47_Nf-3R_c09XWtRGn4KJLEt2DOcGPn-05gyoEme7dSyfJMIVFU5FbWH8pbHR2_hYmtzxl-V8qzw4raJDxKhOgaTg5_t__oZA7vG-WgjKO5mvg2EwglbkTA-Sc1KIVWrgai0BkBVrWTDkbREUk1508N4SooAqkaOrUS8fAuBfNvMrgXNodg62aWT75JWWJI3UVrwIPv7Y8dxEB559kkh3FUwXYubuOSDpv4iMuXt94sa5mV2a7G-b0Xpz73Ir3EWBWorjguBi6K7hnJufavsi8Ppg2pwuqu0F_x-sq_gVF9-SZuvEPfCLMXcpfRxmXZthLdwxdJaZrXPVoV8jeR8kWvBIacGOZ_a7gK9Pe1okqgeM1YNqZm1hOffYG4sqQ2KWLYI3MpHj-XMuPm1rJR6qI4r4MX47LB3j5MW3QiNKvv6Y2tpALBRLVQV1Y9FY93Yc6nWI0yMVRT23TdkOmqynsoYICoyHRF8uHZGHrY77w615jyoK7H3xVTOorvWiELucTQCo8tgB48tfjX9QrjhJkgFpLCoIo-sRv0FgDsu72WLMNCJkqXIU4aFs6nyJrXFQqqSvm1ymVhCwTHGCqG7sc_biPJjCRShr6v4qfEA_odf9_2DfmpXVYBp27J9zihouXm24Z_jrc76ltBF8qEdB09SB08CJzpQ6DOSBAKD5ZoFRHwbQ2MIVDZHs7yW_OWBlMjvqrExTNsCw8fNX7j3an3YTvhXGR3WpG1Q6hkZoP5aoUICEBms2xfDMKLwb6HoIgGsdDtDyt7ASw29PykB3JQNxMpd8pl6l8DAbujZqx4_EVhurz4vH6oeN2wqPcXZHT_dwxDfOonRzDgT84FMi397fvTdcjYMDgI2PQDcmDaheCMdtc9WcdQRC53QMhkiqLEAiebeeVO8p0wD_igHptSWh4ZNYNTeUMTD5V0PXiOjlHhYkRB4ZNRlG4BgczKH_O1Sw2QdHvOBPeXGecVunbaKke8fIpg-H4nJZyvyqluEfxmwibCsCzbt_RHts9JQbIbQC4Bha9YrH9Vx9DOEGo2ykdiMiy_TZpVOgPsE_5c6vktYFrx7HMnduol96lbIshlTrVEkzmqotBs9kdEDlAlZx7Js1PANC285pplcnNUsxEvz_KMwzonrg06JuH9b1ksWpfsZx-MA_BmxL4Jm_auR8TYv0NSy4aVed9uXQSRlUIpMkPywxwNStc0YrhdTZk6B-euhgoCqj1vkqM-fTkhcPW-lbHpdWjpYtjxDTUVhJo4VfVguI0qHqAtuvJspMFwgsvibbB9Vj1l9Yh5TgulqqqD5wVw-IlzTfOEGc6srjKXkEaNV6bc5as5vfPAQzVCfwNkSfQ-lVObzofPa8OCa0BnUSuyMmx2azaObTzliz4q9IKhsW2maQPss4uirCoJcdi6OapjzsYFbZnbFTjSKgPXB-Z2vStwlPte3tZIr-nS0)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [Entity Relationship Diagram](https://plantuml.com/ie-diagram) and [Class Diagram](https://plantuml.com/class-diagram) for syntax help.
* We're using the `*` visibility modifier to denote fields that cannot be `null`.
