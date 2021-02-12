System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/png/dLP1Rniv3xtdL_3BeKY19kwNz50i5eiwiPjcaMpTZDjU2WIoXXvhev5KaR9hBFhVTwYC9nuxNHGz9DP8ukEZI3xf3R6Ad6fxy3_Zj4qbme8vq6-3GLIhayhm8iqIOTJUCJe-qRuUg38QvPOsXJIuU7KyiShnnvlhWLMCnCtKtOLth8p3U184cmrRXEbq24Mj8iExD8EPJwvKSGrBWwk32KRoxYZa7uVs1Hm-Rlr860-RcQ43TEMnq04_1rxiO1u-t-2Kk4Jh6xGUpcWpUzYRNZQWFa9dGw1S2PVJcmRll6Lvf5Oa33uNSEcN5zQdyl0v_7C0qEtGCbdvPRCj3q-QSRi7e5WJOtqt_iQ2TAViR7iRMA_AuvcookdCBZiQNfyt3FhMdPSx5KmFOZYv-e_TqIVEf_7xCwlM6EaFU3HzM2JncoE3jn9JN0D7DPyR3OHnQJIs-8zdmducNBMEM1fMRBphLhlG0RfgE5gjLWtnqEFHBulFE8DX2DRe32US_l8b_bcyWF6t496QDDoYqYmh8qEXWNb8cFRMecRAWALYTG8toR895i4uOZbRWfYSCwwIK7Qv-NYFiQMtGoel_OZNUR9MlYSOvpxMC5Fwlefo322OGYxpWH2zHgAdtMkhQYN5yzPO1D8gyynfpNbHzV2JZAuSOtJAWdfa0utVHvFS7ob8JT6-ez4iPw6S2MDFN4KiFbp3IB6QAS9DyTsE2XcsPWHj_xSdxUQcIh7ptS_X3ttIMGjUdC4iwNlamsuYjoJxY0GabQHXBkUWY91_78NKdVJbhVpknJ2sYXeafHTvwaF2XE3dsmdwsyy8s3yaohlMqVS3-Vj-yD19H--AST7Ooq-cQLnb4GfJENZllhYRjqDO6WLJK-FnkI8ifLB0HvXSVGAjOlcbsLNu57LsVncLOyHCTrjYAb9tf1H93M1vExoP7AiGebysW8LIHUweNdixN4MqHainuWfkPRp9cd799u8Rxmpxc6kkYQZPiYsEMm0togaA8JmKiJGBF0Fhgwen5SnyBS3bU3gOl2-QVn-dWz7uUZmTmz6hLsVF6tJ1RXkyXnmn-CW4Z1PhvBWMEDQXPxYb_8y2MMTENKF_70td6I6QQi7W7LZZxW-6re8MT2qLIr1YC9gn11KHqEcu3lArCho0wNK1_pyvXUGi4e7d1SQL8GJ1BKyEq9LvAAoxgjw-jqg_Sj9xRG4pAxseqJ7rwFU2xoBUr-iG_JSZkeLV4nBJpwTY3wlBpQ-3zaIoKonH7ihXTaWW873q-kNhbq-PjXqLaQF19NOjiPVbtUBgcQl42tJIuOoKPKzitm-RwTFTikgCbXZDV0sc54jUxuVUkJmtFQUTQaPK9GrMqOXNOKp8457xMERu0tsrdNaNzIyZz0ZGsLFc6tKMssNGWAuCtZZUO_7BCBj4EkL5zrLabKH98QYeQjoy9VAM7Ghx02K-2G3F88M6L7iVf1vY9vcjb4bxRQJpucfmCOA92MYDmttDp4zQISAbORciHDZV5SSIUlJMebnl9OA85Xdsyf3f0sWJjKLjn5SUNbpjQAvSqLLxEnRTqsbFV3icapIpXXRPiK0r2q3Dzz7fQLlw7Ujjvxwk3SF2-tiH93ENZjum0lOGauE7qmZTQMImHv2Tr-G8W_Nhtil2Ew2aDHBDastX6k06wLgjxqOxklqmUzlUc7dY3ReorVPV)

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
Boundary(gsa_saas, "FedRAMP-approved SaaS") {
  System_Ext(newrelic, "New Relic", "Continuous Monitoring")
}
Rel(developer, newrelic, "Manage performance & logging", "https GET/POST/PUT/DELETE (443)")
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE (443)")
note right on link
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Rel(www_s3, personnel, "download file attachments", "https GET (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(worker_app, clamav, "scans files", "http POST (8080)")
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
Lay_D(personnel, aws)
Lay_R(HSES, aws)
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/dLP1Rniv3xtdL_3BeKY19kwNz50i5eiwiPjcaMpTZDjU2WIoXXvhev5KaR9hBFhVTwYC9nuxNHGz9DP8ukEZI3xf3R6Ad6fxy3_Zj4qbme8vq6-3GLIhayhm8iqIOTJUCJe-qRuUg38QvPOsXJIuU7KyiShnnvlhWLMCnCtKtOLth8p3U184cmrRXEbq24Mj8iExD8EPJwvKSGrBWwk32KRoxYZa7uVs1Hm-Rlr860-RcQ43TEMnq04_1rxiO1u-t-2Kk4Jh6xGUpcWpUzYRNZQWFa9dGw1S2PVJcmRll6Lvf5Oa33uNSEcN5zQdyl0v_7C0qEtGCbdvPRCj3q-QSRi7e5WJOtqt_iQ2TAViR7iRMA_AuvcookdCBZiQNfyt3FhMdPSx5KmFOZYv-e_TqIVEf_7xCwlM6EaFU3HzM2JncoE3jn9JN0D7DPyR3OHnQJIs-8zdmducNBMEM1fMRBphLhlG0RfgE5gjLWtnqEFHBulFE8DX2DRe32US_l8b_bcyWF6t496QDDoYqYmh8qEXWNb8cFRMecRAWALYTG8toR895i4uOZbRWfYSCwwIK7Qv-NYFiQMtGoel_OZNUR9MlYSOvpxMC5Fwlefo322OGYxpWH2zHgAdtMkhQYN5yzPO1D8gyynfpNbHzV2JZAuSOtJAWdfa0utVHvFS7ob8JT6-ez4iPw6S2MDFN4KiFbp3IB6QAS9DyTsE2XcsPWHj_xSdxUQcIh7ptS_X3ttIMGjUdC4iwNlamsuYjoJxY0GabQHXBkUWY91_78NKdVJbhVpknJ2sYXeafHTvwaF2XE3dsmdwsyy8s3yaohlMqVS3-Vj-yD19H--AST7Ooq-cQLnb4GfJENZllhYRjqDO6WLJK-FnkI8ifLB0HvXSVGAjOlcbsLNu57LsVncLOyHCTrjYAb9tf1H93M1vExoP7AiGebysW8LIHUweNdixN4MqHainuWfkPRp9cd799u8Rxmpxc6kkYQZPiYsEMm0togaA8JmKiJGBF0Fhgwen5SnyBS3bU3gOl2-QVn-dWz7uUZmTmz6hLsVF6tJ1RXkyXnmn-CW4Z1PhvBWMEDQXPxYb_8y2MMTENKF_70td6I6QQi7W7LZZxW-6re8MT2qLIr1YC9gn11KHqEcu3lArCho0wNK1_pyvXUGi4e7d1SQL8GJ1BKyEq9LvAAoxgjw-jqg_Sj9xRG4pAxseqJ7rwFU2xoBUr-iG_JSZkeLV4nBJpwTY3wlBpQ-3zaIoKonH7ihXTaWW873q-kNhbq-PjXqLaQF19NOjiPVbtUBgcQl42tJIuOoKPKzitm-RwTFTikgCbXZDV0sc54jUxuVUkJmtFQUTQaPK9GrMqOXNOKp8457xMERu0tsrdNaNzIyZz0ZGsLFc6tKMssNGWAuCtZZUO_7BCBj4EkL5zrLabKH98QYeQjoy9VAM7Ghx02K-2G3F88M6L7iVf1vY9vcjb4bxRQJpucfmCOA92MYDmttDp4zQISAbORciHDZV5SSIUlJMebnl9OA85Xdsyf3f0sWJjKLjn5SUNbpjQAvSqLLxEnRTqsbFV3icapIpXXRPiK0r2q3Dzz7fQLlw7Ujjvxwk3SF2-tiH93ENZjum0lOGauE7qmZTQMImHv2Tr-G8W_Nhtil2Ew2aDHBDastX6k06wLgjxqOxklqmUzlUc7dY3ReorVPV)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
