System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/svg/dLTTRzky5RxFhpZBHP42Rs8iwSs6OQWJEsc6P7KZjxqfOD3KiSo58bKUqgunzB-FXvOPAKg6lWNQY3hYUPw77-V3xyaBvqEjZ_wYZDIXH5Xxtz3VHoCdjcULykkm38HEMkFH-3Dfwv4edH9ceqCJHbVlJcTQ6F_v_cwaXKVoqRIuYhE5CkZE6iRsock4-NmCHHtfu4DOmj86KmgtWut2xT4C7LbpqgI7GVq773zD_HpvZwDbR01DUSfomAx0hvzX7hyzu9IuGMqZMWzdSh0UzyoR26eTP1y2OKgucTz7lCjMvOdO4YluMi2DtLnf6yhZj_3V8u0yGxAnifiuBGtFuhYT0r3io6EzcFxmZBGGUjcT1jgAydGfj30ogck9ndUNKK7VExCiHADw4EFPxV-PxMpmQJV-yKQB7Jhw9povxZyIywQLmJMloUt0Ex5QAGc4RgCajlXFU-BjahLAwR1KNdXbJVwQbmwGRyF9ThkDmfkUZlwr-8fB63UDLZB1iQP_snB_LVm1qn-DGuh7y812UluoKTH4cFs1IQirIay9i1HUdC5zq5ur6a4Pyhot12uOeqmLbpBGPjqZkbRUCr7fqskwBeFM_3v3jxAkXgMGZvNZRG36P7593pJEHWdqChtKeXPyUQwLHY0faivqhEbSH3t-mgDRuz4PeK4ygO78--IIuYCqVATeI3HPfbCebwpOagyS5f_kO185BWNXuV8zJ0eUjcu4RVotEsrMgWekS_VFy5LEkcZ1YmjO1lc8_ZWRKaXwwv20-2P9MF4-22Bqhw-2xnt7vGC_1skOQa4HISXrCdqA613igdj0_x5B0c_t1sLDI_JpYF__FDf7qic7Obf4VtuacSfK6g5GbO6Fvfkvlnx3HWcOgnfFBoD_oJS5h8FPxHUGmfNVugp21YSJ_OqJnYCckTqKKv5Oa134548KAO1wqLnP6uaNNbIBMXXHfO2-IKQOYmhkzqRMs7cD53__F4dqrJkl93rHZ0yc9k0upOOXnGhB0yqrbW_Z-zcfQ1fdDrZ2oxm6jmwraXnOk8K77Xzke3B11e9xQvItZkE72UEKRgBl0EnN3iq-83dmuGreMrNHbJ5JYOERwNmq-rZ4Fv_deydqRZgVmicxTnTl8pfZvsJLGNROMES9F6giqRiTmtdPPCTdebuyigisVX2YdLvrwXx15uNRd8vJW11_wIjzXMu_eYxPSDwBh8Icf4pBEQprxzJfjfnbdfn-VssZZVK8JbLh3zQ0LkRnQAmrI4QNd5y8IcoKz5Y2S0XefDir_BPLVWtpkmB-UdOEmMWa0klNwBQA41YtF3j2KwOXgyuvgDjbb7PhE5EswSPx8TSr6ayz-RtZpIiULjV6sH-Agmn-3qYUVlso3R3ocVu-QA-avVh2TOBISZj8Z08dVtl5jqs03hrJkC6SmGR7F8YVhhi8Vet6Syr2Wj0sTH_7qNm-l5UjqmQTMkr0bUpfTyErPyfBrIFDHSwXA6cqTOfPMJ6X1uVIkf8Ohg7lEhldLVy-GbS0NRpaVYYcxBjf93UrZLN63rNyBin0oA5GeldELP2uy44ZdAZnqFgbAQz9o00blWW0Ro0qKLHRlaCFCLU6DiTnV1sgmzNjw6e2CzMWLWQ7PM7_2uIBaFBSMt0T_b2Syj8TDtpSZPG8d9T9USjzPnz0AYSrIiLSQNXr-woiS4TLjSrCaJlTGNt9IcPXgHMj4p53nGz0yVta_Boz-bbrbzpMTPoujlQHCv9QSKWV586tt9d2VZUQl1i9x0daMVC_mKRRNQyHZFyeI8b4gw1Rk0Zy_4fWBPHUS5k__uc4fkp1987j2xNEVPySgR_YVYTsYycpeh6tFgJcgZMyZpYXrly3)

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
title TTA Smart Hub boundary view
Person(personnel, "Smart Hub User", "An end-user of the TTA Smart Hub")
Person(developer, "Smart Hub Developer", "Smart Hub vendor developers and GTM")
Boundary(aws, "AWS GovCloud") {
  Boundary(cloudgov, "cloud.gov") {
    System_Ext(aws_alb, "cloud.gov load-balancer", "AWS ALB")
    System_Ext(cloudgov_api, "cloud.gov API")
    System_Ext(cloudgov_router, "<&layers> cloud.gov routers", "Cloud Foundry traffic service")
    Boundary(atob, "Accreditation Boundary") {
      Container(www_app, "<&layers> TTA Smart Hub Web Application", "NodeJS, Express, React", "Displays and collects TTA data. Multiple instances running")
      Container(worker_app, "TTA Smart Hub Worker Application", "NodeJS, Bull", "Perform background work and data processing")
      Container(clamav, "File scanning API", "ClamAV", "Internal application for scanning user uploads")
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
      ContainerDb(www_redis, "Redis Database", "AWS Elasticache", "Queue of background jobs to work on")
    }
  }
}
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
Rel(www_app, google_tag_manager, "manages tags")
Rel(google_tag_manager, google_analytics, "sends traffic data")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE (443)")
note right on link
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Rel(www_s3, personnel, "download file attachments", "https GET (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(worker_app, clamav, "scans files", "https POST (9443)")
Rel(worker_app, HSES, "retrieve Grantee data", "https GET (443)")
Rel(www_app, HSES, "authenticates user", "OAuth2")
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
BiRel(www_app, www_db, "reads/writes dataset records", "psql")
BiRel(worker_app, www_db, "reads/writes dataset records", "psql")
BiRel(www_app, www_s3, "reads/writes data content", "vpc endpoint")
BiRel(worker_app, www_s3, "reads/writes data content", "vpc endpoint")
Rel(www_app, www_redis, "enqueues job parameters", "redis")
BiRel(worker_app, www_redis, "dequeues job parameters & updates status", "redis")
Boundary(development_saas, "CI/CD Pipeline") {
  System_Ext(github, "GitHub", "HHS-controlled code repository")
  System_Ext(circleci, "CircleCI", "Continuous Integration Service")
}
Rel(developer, github, "Publish code", "git ssh (22)")
Rel(github, circleci, "Commit hook notifies CircleCI to run CI/CD pipeline")
Rel(circleci, cloudgov_api, "Deploy application on successful CI/CD run")
Rel(www_app, email_server, "Send application notifications")
Rel(email_server, personnel, "Send application notifications")
Lay_D(personnel, aws)
Lay_R(HSES, aws)
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/dLTTRzky5RxFhpZBHP42Rs8iwSs6OQWJEsc6P7KZjxqfOD3KiSo58bKUqgunzB-FXvOPAKg6lWNQY3hYUPw77-V3xyaBvqEjZ_wYZDIXH5Xxtz3VHoCdjcULykkm38HEMkFH-3Dfwv4edH9ceqCJHbVlJcTQ6F_v_cwaXKVoqRIuYhE5CkZE6iRsock4-NmCHHtfu4DOmj86KmgtWut2xT4C7LbpqgI7GVq773zD_HpvZwDbR01DUSfomAx0hvzX7hyzu9IuGMqZMWzdSh0UzyoR26eTP1y2OKgucTz7lCjMvOdO4YluMi2DtLnf6yhZj_3V8u0yGxAnifiuBGtFuhYT0r3io6EzcFxmZBGGUjcT1jgAydGfj30ogck9ndUNKK7VExCiHADw4EFPxV-PxMpmQJV-yKQB7Jhw9povxZyIywQLmJMloUt0Ex5QAGc4RgCajlXFU-BjahLAwR1KNdXbJVwQbmwGRyF9ThkDmfkUZlwr-8fB63UDLZB1iQP_snB_LVm1qn-DGuh7y812UluoKTH4cFs1IQirIay9i1HUdC5zq5ur6a4Pyhot12uOeqmLbpBGPjqZkbRUCr7fqskwBeFM_3v3jxAkXgMGZvNZRG36P7593pJEHWdqChtKeXPyUQwLHY0faivqhEbSH3t-mgDRuz4PeK4ygO78--IIuYCqVATeI3HPfbCebwpOagyS5f_kO185BWNXuV8zJ0eUjcu4RVotEsrMgWekS_VFy5LEkcZ1YmjO1lc8_ZWRKaXwwv20-2P9MF4-22Bqhw-2xnt7vGC_1skOQa4HISXrCdqA613igdj0_x5B0c_t1sLDI_JpYF__FDf7qic7Obf4VtuacSfK6g5GbO6Fvfkvlnx3HWcOgnfFBoD_oJS5h8FPxHUGmfNVugp21YSJ_OqJnYCckTqKKv5Oa134548KAO1wqLnP6uaNNbIBMXXHfO2-IKQOYmhkzqRMs7cD53__F4dqrJkl93rHZ0yc9k0upOOXnGhB0yqrbW_Z-zcfQ1fdDrZ2oxm6jmwraXnOk8K77Xzke3B11e9xQvItZkE72UEKRgBl0EnN3iq-83dmuGreMrNHbJ5JYOERwNmq-rZ4Fv_deydqRZgVmicxTnTl8pfZvsJLGNROMES9F6giqRiTmtdPPCTdebuyigisVX2YdLvrwXx15uNRd8vJW11_wIjzXMu_eYxPSDwBh8Icf4pBEQprxzJfjfnbdfn-VssZZVK8JbLh3zQ0LkRnQAmrI4QNd5y8IcoKz5Y2S0XefDir_BPLVWtpkmB-UdOEmMWa0klNwBQA41YtF3j2KwOXgyuvgDjbb7PhE5EswSPx8TSr6ayz-RtZpIiULjV6sH-Agmn-3qYUVlso3R3ocVu-QA-avVh2TOBISZj8Z08dVtl5jqs03hrJkC6SmGR7F8YVhhi8Vet6Syr2Wj0sTH_7qNm-l5UjqmQTMkr0bUpfTyErPyfBrIFDHSwXA6cqTOfPMJ6X1uVIkf8Ohg7lEhldLVy-GbS0NRpaVYYcxBjf93UrZLN63rNyBin0oA5GeldELP2uy44ZdAZnqFgbAQz9o00blWW0Ro0qKLHRlaCFCLU6DiTnV1sgmzNjw6e2CzMWLWQ7PM7_2uIBaFBSMt0T_b2Syj8TDtpSZPG8d9T9USjzPnz0AYSrIiLSQNXr-woiS4TLjSrCaJlTGNt9IcPXgHMj4p53nGz0yVta_Boz-bbrbzpMTPoujlQHCv9QSKWV586tt9d2VZUQl1i9x0daMVC_mKRRNQyHZFyeI8b4gw1Rk0Zy_4fWBPHUS5k__uc4fkp1987j2xNEVPySgR_YVYTsYycpeh6tFgJcgZMyZpYXrly3)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
