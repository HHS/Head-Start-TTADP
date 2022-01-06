System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/svg/dLTDRnkn4RthLqnz21mWib0dbnP54DcI7HTsetYLv9040iKThLXpIOOSIX6A_FToLYjAyjf5ceEzt5dEUu_aV53l0WbFiTQzloWZTImHbaGk_7qmy69zLYbQndaCwAKrX8REfAq7elHAc9MEBWukt_GdMXZwT7Sxq88mK3BDBjDieGpwCyVOf4WZJAT3AEf41-_Z7EOscbBu3QmKhdiJzC6QKzSy3EfNSBAV-YdndoJBq02Qiizom2w0beymJrxkS4fSeRO9xGXdjBEU79bN2THwo3u1X2dXUdgNy2vQbQTY7LZ1bmAkxUfIsrYUl8J_z03o3Cd6ogxIj6PubiRj781Y4mZhsVWdCT9CwFdXDD1MbFsvqCB8fAub6jvU90N7tfbb9fmwWXXERlx7R6yZDRlnZnTQRD27jx1ttNuCpDki3AvuJNu3vCLYeIG4z2ibiSNVxmdPEMkLqcEfI92o9d_DImV8qN2wNg-JS7UaupWilk0SXivf9HiurlGlM-8_YrSm_kayXdGCzoWayPUH2Yx1R0zCMgrHKcW0Iq7Y3EwY9kKqWZA1U6y3-6YCCbLQIaURzG_eMtcFH3MVdjDr4RNczmdwXVKrp8Lyg3nl0p0cYslqWFCsIGXFqqijQi71SwKqGf2YqSd7kZqNKGy_y-Z647eZD8Yz6aYyUvScFwBZc0fTej6yEOLopefjeCfZyV4MHeB4N0JS1T_zgE1XwnQWpVzsfyr2LT5dxauQFiqPNhVWnMkOH_c0T98DF2h8UWmGE98aB7WVH0X8pw-2uuxpyfwVdJMCjGW9ISXbO_eOCIBOnU41_TlE0v3T7fGrBT6l7l_zwcqpwVHzCIwIFpyQcSfK6g5GbO4Fvfkvknh2IWcOgXhx5uc_v4W1ws5oyncayEMtDAkmqSk6_jeBGuYDtCCIKmKn2q84fX2YQ1Fe89ihQnFnZ4GrguKHLPFGruqHfgA2kwsHDHwy9efV_pz9yjKRKZBiAOOx4nDmdcP3bsA1vOxc2ilxuTsaBvppTeKbFCrhSErHAyc9XMkuv_4k0fM9DWQuiqQHzPm_J9Yc71Rw0u3joi5j4v8J7rw0jbMLN1cpQN5mFPuE9X-AzE_JT30QtuwdOpXzy-RrouJEsBbO7I1xTDPJ04ADDPBVC1n9bnqVYNhoo2xR_458zj1rUk88FYjSxyin9qZWBwrlRfjF-XPeoW36clxavYQ3S4NgkdVrTW1OypFU-zQsTSwb-FSstLX2yAfQ4bW3Mfc7tb1ha8mkkTOaNdHA4fOWF08QwJUEtzQAbZ2zBU2lP-SGZSOGmD8I_Le51COjptfeocR8gdCzEhnnb7Pjk6gsfOT8o6MDXiAH_AEZpYlkTbhdxK_57GT_H0mKVZ_mEbWv4lySzAYzvLx3FICqopr0OXGu_Tiplcqnz4XUuGfpDUiSSpUN3jn5f2KQulw50M9xmVimJERpRborJYlqQh41LR8dRRfhpvGNweWqDpoFeWo3jLVCoee34dYKrfU1uLpueRDxNlKV8NG4SBHrtNUDbNrNJWAQqbbbgAFYZs4wGdPD4qsAeOY1co0uuKMDksjWC-Kv2HcWn2S1u0L4bqIrhJmU8UOkqTOxpgzTfxYy6LoEOA8SQcMmsoAslqQu8IdYUmRtvFT5dvVk-VB7DvCIWMjqK6Jv3deC89MN6gLYhcPuUVEenV3jgcelDaM-zNPwJLOoYNEjmh8XPgZq0K9wFpq_RqC_gpuajtMj29RMFd15KWjEwPqY8CktLDZkXcjtemNRWppw8J12f-tcw59e3OGe-SQvYBg5Iy09wLPiPgD7XNjhlMylEutXQvxn7Vg-_nQ-jd7qlVSEJHbh_Ly0)

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
Rel(personnel, google_analytics, "Sends non-PII traffic data")
Rel(personnel, google_tag_manager, "Sends non-PII tags data")
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
Lay_D(personnel, aws)
Lay_R(HSES, aws)
[personnel] -r-> [www_app]
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/dLTDRnkn4RthLqnz21mWib0dbnP54DcI7HTsetYLv9040iKThLXpIOOSIX6A_FToLYjAyjf5ceEzt5dEUu_aV53l0WbFiTQzloWZTImHbaGk_7qmy69zLYbQndaCwAKrX8REfAq7elHAc9MEBWukt_GdMXZwT7Sxq88mK3BDBjDieGpwCyVOf4WZJAT3AEf41-_Z7EOscbBu3QmKhdiJzC6QKzSy3EfNSBAV-YdndoJBq02Qiizom2w0beymJrxkS4fSeRO9xGXdjBEU79bN2THwo3u1X2dXUdgNy2vQbQTY7LZ1bmAkxUfIsrYUl8J_z03o3Cd6ogxIj6PubiRj781Y4mZhsVWdCT9CwFdXDD1MbFsvqCB8fAub6jvU90N7tfbb9fmwWXXERlx7R6yZDRlnZnTQRD27jx1ttNuCpDki3AvuJNu3vCLYeIG4z2ibiSNVxmdPEMkLqcEfI92o9d_DImV8qN2wNg-JS7UaupWilk0SXivf9HiurlGlM-8_YrSm_kayXdGCzoWayPUH2Yx1R0zCMgrHKcW0Iq7Y3EwY9kKqWZA1U6y3-6YCCbLQIaURzG_eMtcFH3MVdjDr4RNczmdwXVKrp8Lyg3nl0p0cYslqWFCsIGXFqqijQi71SwKqGf2YqSd7kZqNKGy_y-Z647eZD8Yz6aYyUvScFwBZc0fTej6yEOLopefjeCfZyV4MHeB4N0JS1T_zgE1XwnQWpVzsfyr2LT5dxauQFiqPNhVWnMkOH_c0T98DF2h8UWmGE98aB7WVH0X8pw-2uuxpyfwVdJMCjGW9ISXbO_eOCIBOnU41_TlE0v3T7fGrBT6l7l_zwcqpwVHzCIwIFpyQcSfK6g5GbO4Fvfkvknh2IWcOgXhx5uc_v4W1ws5oyncayEMtDAkmqSk6_jeBGuYDtCCIKmKn2q84fX2YQ1Fe89ihQnFnZ4GrguKHLPFGruqHfgA2kwsHDHwy9efV_pz9yjKRKZBiAOOx4nDmdcP3bsA1vOxc2ilxuTsaBvppTeKbFCrhSErHAyc9XMkuv_4k0fM9DWQuiqQHzPm_J9Yc71Rw0u3joi5j4v8J7rw0jbMLN1cpQN5mFPuE9X-AzE_JT30QtuwdOpXzy-RrouJEsBbO7I1xTDPJ04ADDPBVC1n9bnqVYNhoo2xR_458zj1rUk88FYjSxyin9qZWBwrlRfjF-XPeoW36clxavYQ3S4NgkdVrTW1OypFU-zQsTSwb-FSstLX2yAfQ4bW3Mfc7tb1ha8mkkTOaNdHA4fOWF08QwJUEtzQAbZ2zBU2lP-SGZSOGmD8I_Le51COjptfeocR8gdCzEhnnb7Pjk6gsfOT8o6MDXiAH_AEZpYlkTbhdxK_57GT_H0mKVZ_mEbWv4lySzAYzvLx3FICqopr0OXGu_Tiplcqnz4XUuGfpDUiSSpUN3jn5f2KQulw50M9xmVimJERpRborJYlqQh41LR8dRRfhpvGNweWqDpoFeWo3jLVCoee34dYKrfU1uLpueRDxNlKV8NG4SBHrtNUDbNrNJWAQqbbbgAFYZs4wGdPD4qsAeOY1co0uuKMDksjWC-Kv2HcWn2S1u0L4bqIrhJmU8UOkqTOxpgzTfxYy6LoEOA8SQcMmsoAslqQu8IdYUmRtvFT5dvVk-VB7DvCIWMjqK6Jv3deC89MN6gLYhcPuUVEenV3jgcelDaM-zNPwJLOoYNEjmh8XPgZq0K9wFpq_RqC_gpuajtMj29RMFd15KWjEwPqY8CktLDZkXcjtemNRWppw8J12f-tcw59e3OGe-SQvYBg5Iy09wLPiPgD7XNjhlMylEutXQvxn7Vg-_nQ-jd7qlVSEJHbh_Ly0)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
