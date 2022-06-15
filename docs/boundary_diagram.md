System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/png/jLVTRXkz4RtNKqnz4JX0PA5sUj6Y229BigF2QXIlabmaWS3bZbQiAN933gK8HTwzdDMANdlj0Cs73qYitH7ddCCXvqTlFGb7OQDxVr56wb0Wh8ag_u_1m8dTMQbe7VBWqKbh20sTIRiPYC8fOROwL64mUjsVQs7eu-nce0MXfsXQZk9geGowiugnIP56M2o6y2xaaDjW2k7si5MuwytHUMjEg_h3e7u59yU57oFlINmV6a1Jz5a6s1NGEc6Tl3pw5xX5RIDAotzyj9sqZDi8PHsazHw4AU1wCOjObusoKx7ppFivWskx7MaRYfENyDyUG5eXsLZQRLnMFvx5vsODGBRtX9lbv0SnqbBelBqCj1L5FnTQ61crDKJ3cykeuA5tObcAIZs06CwdlrZjRA0w4lzyeSKUdNy3zww7BptprZk3AzwJsmCviLef2HxTLabiyEzZGZPdhL8wB1G9KjQaRzFM0TBPd-vskoYyQkj8b-0pvZ2iAgra3SHg_cqB_5Vs2YO_AeS-7i0j2adypLZvAW8SZafQhL6Ihw4AGU8CPa6JgZI2CfuugXvSC4QPCcwYeygwEtIDi2IdDZwdw39epUzpT2lhDf0BULSwtZemMYsBbK3bR2JtJnDBBJQ2ByoLqWXUYbeX7-NXBCHc-8cVfeRG6Q51tAk1o7llKcT2gFWU-IxHEAyZN-Iis7eg7MOVRc0S1UR2u_72tOupVcpSF3GPtiJOh5GPNE9k9zspZFwYWSuk80_o3kaa6VWf8-lGW-Ux8s75KH3U8ps_1xvfd8ct_DdPmKGB7v64NDUc3m43WbsrZ-S_DlT0zd1CrZH4Ftly_sVla3kdxzvbososc2ypTDiwRoOReJGSNXawhe2MZSCHySirJ9qrS-ie0X_1iaaMFVYZthCofKR8L6dWlVbgPbT3s2e12xN1_gNmMF2b0-jWFlq4KhZYQroLsU1alPTh9mmXrdjlLwZIYwKNmZE545cJVwrYK5eRYPSaokL6657M-xgkZR0G9SmEHjROUeqKF_z_akYhzwIalwSO7arCmCcU35sA5HP7cYiiReUpULzKbRDRBE1fNeCxXrf9pb7SmIq_7o-pCi463pDh55d7gSY4SKcxHxG03Zk7wf3RN3tW1MXRbj6LCUj-2DUJnM3-Fej_FYu6uydDP361qzUlBrv6TCPEjQw5xB2oZZmGQjmWkJt3aQpQZcrHJnxPg4b5X6ZtppgrZ-2JmbsgvdMsSPeSVLEdVT8tGrDuCDRqvzDf0k7YrdNlwkq0iEPdlEyxuy4vrVDV1lqLU9GSZHtctdADyT27prcMWcei8JXLhWci0QtCNM-eDKYcbLpFeY2ib2GiG4GWDDBjAtxRALh3uYQ3lvwTGp0QlGTBQtGxvH4OjpZheIdgHzvEgdhjwQMmEyELkIbmH4AkDsZ8FzZNWpkGGj7ju9MpFnJtC_mUq9F_Wy5XjWv9khj_1bkxtQOEo9tCrm5gKJ0ydFxz6TzkaJQMr8hL1j_CCvnkSFwtnodPb6I7v1Hk4MvHgagXeUvrQqll08X0w-Z5BRbXPT_tmsW-xzxlnYbgLQizg88zQT-DQAAyL0z8KmztA0e_s3d5hApO8u53QLrnsBN_hfDx2jdl8xG5-8kdt8-p0ljkAydJUMMLeQwAtuNf23bE0cZYpGpekRD39PpOu76QhPSy9o415FWa0Bo0K4LHpNmIkeXFwnbPwmfbQiUK1-13xgLJrQ7Sv4WxH9EcqpPsweJ7ciwbujWDHzF1Q0npLQ5M1hjjyF3pZ9kkeZYODPDAdyFgU4hcGQv0u3xa5LaUqny2IEMaHgcOgtuSJH-rKHv6osOEpD8FWqu_JKhc8TVAhsjYXefVW8_lf-VdJLebrMrokzd4XMjhxo2bzL4HaELn7WxHg58qQh1xa4U_bSPOQRj_C4F7Vpv87j1NGJTm4JWYtOZzSloeEHsijyr0Lnk-f1NVeE_wR-1BSoU-zTwYAS96_my0)

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
title TTA Hub boundary view
Person(personnel, "TTA Hub User", "An end-user of the TTA Hub")
Person(developer, "TTA Hub Developer", "TTA Hub vendor developers and GTM")
Boundary(aws, "AWS GovCloud") {
  Boundary(cloudgov, "cloud.gov") {
    System_Ext(aws_alb, "cloud.gov load-balancer", "AWS ALB")
    System_Ext(cloudgov_api, "cloud.gov API")
    System_Ext(cloudgov_router, "<&layers> cloud.gov routers", "Cloud Foundry traffic service")
    Boundary(atob, "Accreditation Boundary") {
      Container(www_app, "<&layers> TTA Hub Web Application", "NodeJS, Express, React", "Displays and collects TTA data. Multiple instances running")
      Container(worker_app, "TTA Hub Worker Application", "NodeJS, Bull", "Perform background work and data processing")
      Container(clamav, "File scanning API", "ClamAV", "Internal application for scanning user uploads")
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for the TTA Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
      ContainerDb(www_redis, "Redis Database", "AWS Elasticache", "Queue of background jobs to work on")
    }
  }
}
System(HHS_SMTP_Server, "Email Server", "HHS Email Server through IronPort")
System(HSES, "HSES", "Single Sign On\nMFA via Time-Based App or PIV card\n\nSource of Grantee Data")
Boundary(gsa_saas, "SaaS") {
  System_Ext(google_tag_manager, "Google Tag Manager", "Tag Manager")
}
Boundary(gsa_saas, "SaaS") {
  System_Ext(google_analytics, "Google Analytics", "Web Analytics")
}
Boundary(gsa_fed_saas, "FedRAMP-approved SaaS") {
  System_Ext(newrelic, "New Relic", "Continuous Monitoring")
}
Rel(developer, newrelic, "Manage performance & logging", "https GET/POST/PUT/DELETE (443)")
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(developer, google_tag_manager, "Configure tags")
Rel(developer, google_analytics, "View traffic statistics")
Rel(personnel, google_analytics, "Sends non-PII traffic data")
Rel(personnel, google_tag_manager, "Sends non-PII tags data")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE, secure websockets - WSS (443)")
note right on link
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Rel(www_s3, personnel, "download file attachments", "https GET (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE, secure websockets - WSS (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE, secure websockets - WSS (443)")
Rel(worker_app, clamav, "scans files", "https POST (9443)")
Rel(worker_app, HHS_SMTP_Server, "notifies users", "port 25")
Rel(www_app, HSES, "retrieve Recipient data", "https GET (443)")
Rel(www_app, HSES, "authenticates user", "OAuth2")
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
BiRel(www_app, www_db, "reads/writes dataset records", "psql")
BiRel(worker_app, www_db, "reads/writes dataset records", "psql")
BiRel(www_app, www_s3, "reads/writes data content", "vpc endpoint")
BiRel(worker_app, www_s3, "reads/writes data content", "vpc endpoint")
Rel(www_app, www_redis, "enqueues job parameters", "redis")
BiRel(worker_app, www_redis, "dequeues job parameters & updates status", "redis")
BiRel(www_app, www_redis, "Coordinates websocket subscriptions between instances", "redis")
Boundary(development_saas, "CI/CD Pipeline") {
  System_Ext(github, "GitHub", "HHS-controlled code repository")
  System_Ext(circleci, "CircleCI", "Continuous Integration Service")
}
Rel(developer, github, "Publish code", "git ssh (22)")
Rel(github, circleci, "Commit hook notifies CircleCI to run CI/CD pipeline")
Rel(circleci, cloudgov_api, "Deploy application on successful CI/CD run")
Lay_D(personnel, aws)
Lay_R(HSES, aws)
[personnel] -r-> [www_app]
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/jLVTRXkz4RtNKqnz4JX0PA5sUj6Y229BigF2QXIlabmaWS3bZbQiAN933gK8HTwzdDMANdlj0Cs73qYitH7ddCCXvqTlFGb7OQDxVr56wb0Wh8ag_u_1m8dTMQbe7VBWqKbh20sTIRiPYC8fOROwL64mUjsVQs7eu-nce0MXfsXQZk9geGowiugnIP56M2o6y2xaaDjW2k7si5MuwytHUMjEg_h3e7u59yU57oFlINmV6a1Jz5a6s1NGEc6Tl3pw5xX5RIDAotzyj9sqZDi8PHsazHw4AU1wCOjObusoKx7ppFivWskx7MaRYfENyDyUG5eXsLZQRLnMFvx5vsODGBRtX9lbv0SnqbBelBqCj1L5FnTQ61crDKJ3cykeuA5tObcAIZs06CwdlrZjRA0w4lzyeSKUdNy3zww7BptprZk3AzwJsmCviLef2HxTLabiyEzZGZPdhL8wB1G9KjQaRzFM0TBPd-vskoYyQkj8b-0pvZ2iAgra3SHg_cqB_5Vs2YO_AeS-7i0j2adypLZvAW8SZafQhL6Ihw4AGU8CPa6JgZI2CfuugXvSC4QPCcwYeygwEtIDi2IdDZwdw39epUzpT2lhDf0BULSwtZemMYsBbK3bR2JtJnDBBJQ2ByoLqWXUYbeX7-NXBCHc-8cVfeRG6Q51tAk1o7llKcT2gFWU-IxHEAyZN-Iis7eg7MOVRc0S1UR2u_72tOupVcpSF3GPtiJOh5GPNE9k9zspZFwYWSuk80_o3kaa6VWf8-lGW-Ux8s75KH3U8ps_1xvfd8ct_DdPmKGB7v64NDUc3m43WbsrZ-S_DlT0zd1CrZH4Ftly_sVla3kdxzvbososc2ypTDiwRoOReJGSNXawhe2MZSCHySirJ9qrS-ie0X_1iaaMFVYZthCofKR8L6dWlVbgPbT3s2e12xN1_gNmMF2b0-jWFlq4KhZYQroLsU1alPTh9mmXrdjlLwZIYwKNmZE545cJVwrYK5eRYPSaokL6657M-xgkZR0G9SmEHjROUeqKF_z_akYhzwIalwSO7arCmCcU35sA5HP7cYiiReUpULzKbRDRBE1fNeCxXrf9pb7SmIq_7o-pCi463pDh55d7gSY4SKcxHxG03Zk7wf3RN3tW1MXRbj6LCUj-2DUJnM3-Fej_FYu6uydDP361qzUlBrv6TCPEjQw5xB2oZZmGQjmWkJt3aQpQZcrHJnxPg4b5X6ZtppgrZ-2JmbsgvdMsSPeSVLEdVT8tGrDuCDRqvzDf0k7YrdNlwkq0iEPdlEyxuy4vrVDV1lqLU9GSZHtctdADyT27prcMWcei8JXLhWci0QtCNM-eDKYcbLpFeY2ib2GiG4GWDDBjAtxRALh3uYQ3lvwTGp0QlGTBQtGxvH4OjpZheIdgHzvEgdhjwQMmEyELkIbmH4AkDsZ8FzZNWpkGGj7ju9MpFnJtC_mUq9F_Wy5XjWv9khj_1bkxtQOEo9tCrm5gKJ0ydFxz6TzkaJQMr8hL1j_CCvnkSFwtnodPb6I7v1Hk4MvHgagXeUvrQqll08X0w-Z5BRbXPT_tmsW-xzxlnYbgLQizg88zQT-DQAAyL0z8KmztA0e_s3d5hApO8u53QLrnsBN_hfDx2jdl8xG5-8kdt8-p0ljkAydJUMMLeQwAtuNf23bE0cZYpGpekRD39PpOu76QhPSy9o415FWa0Bo0K4LHpNmIkeXFwnbPwmfbQiUK1-13xgLJrQ7Sv4WxH9EcqpPsweJ7ciwbujWDHzF1Q0npLQ5M1hjjyF3pZ9kkeZYODPDAdyFgU4hcGQv0u3xa5LaUqny2IEMaHgcOgtuSJH-rKHv6osOEpD8FWqu_JKhc8TVAhsjYXefVW8_lf-VdJLebrMrokzd4XMjhxo2bzL4HaELn7WxHg58qQh1xa4U_bSPOQRj_C4F7Vpv87j1NGJTm4JWYtOZzSloeEHsijyr0Lnk-f1NVeE_wR-1BSoU-zTwYAS96_my0)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
