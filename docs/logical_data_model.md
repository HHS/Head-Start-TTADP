Logical Data Model
==================

<img src="http://www.plantuml.com/plantuml/png/pLXVRzis47_Nf-3R_c0DXWtRGn4KJLDt2DOcGPn-05gyoEme7aUUqXf9lljC7yo8aPJ8LfRjfOL_z__F7Kzv6qXwQcfJX58Q43yV_FvRKNmdv3Lg9Pp7XO4wYA-QbaBQoe0IfSUlGLm1K17-qjP9BsjXj0LQEH3eQOb5KHePWlWSm8kRGeWVXLRYjT2Me5f3XuSLMF2IGBrvio4l0uJ8VHBP0dbjgmotieOs9U973ItHQz8GrYJflLmTCaFK-L32BT72QLClmBTXgAKsRO0q6NWjm3Prj8CrN42bqPwq0lZ-rrz-41Up3xEBsUdnR2vSip2wF636SA3LndSZ0tt4Ijkr8EaQ0idQRIYbXnZx4NKeZLCzbBjjGjd2k9Jc2KWgvYKws4U340f2wRKZZJQXay8v1r_h44Q7r0Jm8-eG6oPLmUzPlH3pD49iaq-McbRPlni8DFCUVHYJ3NJnXqRRhb3ZTVjd3RJ4RA8yctc7QfN3mQ4DC8GVeuA4JmmKJL_xFTQob-XqELuccM6vKPtbqOmfTjIQQarH_ObwIcRZnVG6-GEb6PS38G99Qa8RYGgl_0Cs7JvuhEUrz1IM07H9yjp8s50BH0FIJlAOo_QOsnLACoBfKSL_bFHJ-4Pp0dS_aNa4iYHzhMbr0GuzFUtMKSQ_TSyYGQii35ok7FHFt60C0ukbr4w3fQ4gD93jZ6ut2U6tEg9JYJIndxqSzibstkbzrtXoVOpebZSATwQ84K_l9S63OC6g7hHKEXkbgSdYKHgrpVO9EgMiydAKP7IAfVOOvcdvEACb-9abJQlzJfa9jlCP7cFUG2NBrObgsPyTV_pp-082DhxSNBYgxuH5s-NhiacbD6cqqfmYGTQmF4TdL-VIaowrYmNBHas1qTVWLvywbu9gqdcXeDIrD5cZnnHb4v6Wj1ExIoExGVBvTXuhB-l8stVDa_GLq3cwncoywkEvrfuQQTu3XzGrAmFQ7ZdNJaw7p2zE7w54I_2DiYXa1NFYT7m96ASUZVeaxHhtUNNuo6mMV03RUMVPbDAKCLfGJ6kHY2H7b_l4rewSytYz_ircTpwOTp-oZGpqcOVctUfVlizPxDd6bvCryYkryzoB7T_xtJFSVedQSutqNEliRF45efSmBWKxh7dsdJIPUrz_ukuzZnsgG6KuHvb1pr3drkfxmIBlz8Qo2Dw_QIC4Mo_WCu_4CHeZ5-WbuVzwB0RSZvttecxlE143RgSnV57VSMjrX8RauOH-YxKJjxUly4RmEcVa3b-zkhrf_JceuBzITN6MwYEWsVBpXsV1N_ztjniePhz85ycMCPtLHVodWxBIWmCH_syfxOVORDAMaDnqZ3uPsOQJONcbefhX-UJqFSxIrPU-Qf-onLd880u0RmRUqQ8VvjJUYkXkoaxN59EuP0_8JEBMIPrO3CmGczk1CIUt-hH3odzcFDbRKyHYRkZzvDR-7cPw2rOrjVa7" alt="logical data model diagram">

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
  * uei : string
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
  * submissionStatus : string
  calculatedStatus: string
  ttaType : array<string>
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
