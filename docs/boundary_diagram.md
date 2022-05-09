System Boundary Diagram
=======================

![rendered boundary diagram](www.plantuml.com/plantuml/png/jLTFRnk_4RthKqnz21mWib0dFRGeVeXioOuAgr6yId980e7YZbQiAN933gK8HRvxEVk7Ndlj00tmEoJQdUMyzsR8uOpVUXAEmauF_gACr257s1AL_X-ZaHE7iqBHDgo3HoUj8JHq9krk97AdXDdhK8RHvPlXGWj37-St8oq8FKNJwZAk5igWEoiPcnHfXELo3E_26jOsc5ou8-mL7WOBTDwQqxBwCQXVmKcxy6FaFOdlOmDeyY7B0Bi1sYQiavUjVuvxr3QYTFmdhUsaOzn7AEiWhVSWJ0xNotd4kcYKdOg3PzxF6LpR_QMs8Jzv2VyT0AGLaes5tSTbrUDPV6xM06H7JxXRJNyG8ws4NdUNWROY7ww55aRMsfXeV7CH5JpqJYmhKQe74EF5x1UhdGrKPUAVBxGuelD_mBrh_T4pRnKPN75CxWZan6QZ97XqUoMnmR_F2TarQvNIOQv8aB8cVKsX0wIzFpqS3b5usTMH3i5dNCEuBBMI5H2h-RVDyL_PAvZ-A1twk06tA2JnbudoPGIejqfQhL6Ihw1oGU8Cva6JAZM2CfuugnvSC4QP8WRHKsNT7Rf6M99J6PzJT16qvlS5kerrErWBULSu3XqOhPB5Ig1qDfBxfucb5Zl11-PAQGGlHQMGjxBU2x4RV-AdcI5qHcWGzseWyjwxL9KGIZv7layqMLUPpzUis7eg76OVRc0YIAo5n_R0tKuoVcpSF3GLtkJOR5GHNEBk5jspZFvr0vszXdMGTqWdoS1F6Lc77ZoV7GaRpeBm7kdv6FYaSINUycylWgaMFY89kQrC7m861BlfRiz_xDe3sNgRh6c8VWxutyz1NJkdxzvbgso-NAmoTFkgRgOxeJJKhmmTLq37nkc8-CKMPiwQXNKKWLkmR9gnH_ofObQcq0YPAWoyDr_D_6eCUoLWgNOul10USpvqO1qiPfz02fT_ZQio6voiOhbsmX1Y5NltXYgyM7aXF5C8aJNrrxaC2ciZyOf4iTe98ueghklA24jHmBmsiiREQwJu-V-JH5zz92NzFSMuDJ415tioz2ascBSqLvZVZkUBeIXBP_UOmzEy1WyEjP9SetY0Mtvk3xComGOFSsiKMSUbo8HnIRT7T03goA6iQvjl3tW1sXP5T6NCgX_2zNGvMhpFudyVbwF9z6QwdCBfcpUlNqPqnavtNGVPOMaTUI3Kk4DoHuOZMNOTkwAUtBBBfXGHejq_wzJTWayA3_UtELSRbqdhcphjaxuPcjo3iMQucCqI25zkVVU-tXu0Qtx6-xuprixfFlzbqb-1HydPEE3QMxvZF0pXSvQbf1fB24uLMm9hG2jpDnXh3P9f9Tzd7d8ibIJCGJW4DD8TItuxADh2yYQ3lvwTGp0QlGTBMtG7vH4ODpyReCchHmudtNhTwIMt1yCtStF14GcvtQ4X_o2k1sSWfQBVmKjdVoZkP_Wze2V_-yb9R3sIT7R_3BPkkqqTa3kPhnBKeM1uEFtxCxxzIzfOKXjM6tmppt2vmVdV7fTaSoKx9ATmZt2BKfKA3VMFMqTw7q04saOlRiaDA_k-7qVpUVzyDqvHgzeSGUNiIST-HXFbXNf0cdguGv7xqS4fPcN57WaSIkloEch_NIVtbBBVH-WAuCFTTszd1VRTbvAdyz8gGtqLlmlJ4z9E0cY-SvlttDcX54xii9rcgoNFIKW0EJu902yWb55KCv-4BcBgLkszo-NSTgpBsUXo0WjLebO6-wsg_XEA6wCY7fxgQMB8eJkUP7dOoX6uLtX5baVfXm1IEQbHAkQg7YzdZreT3un5CwjbQNZlzRoaP17MMlbjHSnGyGFu-7vwVjuS_QIwIsvtEqMmjVOEKkcrYe0iZznGPwDCsM2mJWIF_fwPOAdjyS6SQmtu87c8tWHTmp5mHBeHnzNaKGEfhRVrq5KRlgGLts3eXd_0b-OSVHkyHPE7dVuV)

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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/jLTFRnk_4RthKqnz21mWib0dFRGeVeXioOuAgr6yId980e7YZbQiAN933gK8HRvxEVk7Ndlj00tmEoJQdUMyzsR8uOpVUXAEmauF_gACr257s1AL_X-ZaHE7iqBHDgo3HoUj8JHq9krk97AdXDdhK8RHvPlXGWj37-St8oq8FKNJwZAk5igWEoiPcnHfXELo3E_26jOsc5ou8-mL7WOBTDwQqxBwCQXVmKcxy6FaFOdlOmDeyY7B0Bi1sYQiavUjVuvxr3QYTFmdhUsaOzn7AEiWhVSWJ0xNotd4kcYKdOg3PzxF6LpR_QMs8Jzv2VyT0AGLaes5tSTbrUDPV6xM06H7JxXRJNyG8ws4NdUNWROY7ww55aRMsfXeV7CH5JpqJYmhKQe74EF5x1UhdGrKPUAVBxGuelD_mBrh_T4pRnKPN75CxWZan6QZ97XqUoMnmR_F2TarQvNIOQv8aB8cVKsX0wIzFpqS3b5usTMH3i5dNCEuBBMI5H2h-RVDyL_PAvZ-A1twk06tA2JnbudoPGIejqfQhL6Ihw1oGU8Cva6JAZM2CfuugnvSC4QP8WRHKsNT7Rf6M99J6PzJT16qvlS5kerrErWBULSu3XqOhPB5Ig1qDfBxfucb5Zl11-PAQGGlHQMGjxBU2x4RV-AdcI5qHcWGzseWyjwxL9KGIZv7layqMLUPpzUis7eg76OVRc0YIAo5n_R0tKuoVcpSF3GLtkJOR5GHNEBk5jspZFvr0vszXdMGTqWdoS1F6Lc77ZoV7GaRpeBm7kdv6FYaSINUycylWgaMFY89kQrC7m861BlfRiz_xDe3sNgRh6c8VWxutyz1NJkdxzvbgso-NAmoTFkgRgOxeJJKhmmTLq37nkc8-CKMPiwQXNKKWLkmR9gnH_ofObQcq0YPAWoyDr_D_6eCUoLWgNOul10USpvqO1qiPfz02fT_ZQio6voiOhbsmX1Y5NltXYgyM7aXF5C8aJNrrxaC2ciZyOf4iTe98ueghklA24jHmBmsiiREQwJu-V-JH5zz92NzFSMuDJ415tioz2ascBSqLvZVZkUBeIXBP_UOmzEy1WyEjP9SetY0Mtvk3xComGOFSsiKMSUbo8HnIRT7T03goA6iQvjl3tW1sXP5T6NCgX_2zNGvMhpFudyVbwF9z6QwdCBfcpUlNqPqnavtNGVPOMaTUI3Kk4DoHuOZMNOTkwAUtBBBfXGHejq_wzJTWayA3_UtELSRbqdhcphjaxuPcjo3iMQucCqI25zkVVU-tXu0Qtx6-xuprixfFlzbqb-1HydPEE3QMxvZF0pXSvQbf1fB24uLMm9hG2jpDnXh3P9f9Tzd7d8ibIJCGJW4DD8TItuxADh2yYQ3lvwTGp0QlGTBMtG7vH4ODpyReCchHmudtNhTwIMt1yCtStF14GcvtQ4X_o2k1sSWfQBVmKjdVoZkP_Wze2V_-yb9R3sIT7R_3BPkkqqTa3kPhnBKeM1uEFtxCxxzIzfOKXjM6tmppt2vmVdV7fTaSoKx9ATmZt2BKfKA3VMFMqTw7q04saOlRiaDA_k-7qVpUVzyDqvHgzeSGUNiIST-HXFbXNf0cdguGv7xqS4fPcN57WaSIkloEch_NIVtbBBVH-WAuCFTTszd1VRTbvAdyz8gGtqLlmlJ4z9E0cY-SvlttDcX54xii9rcgoNFIKW0EJu902yWb55KCv-4BcBgLkszo-NSTgpBsUXo0WjLebO6-wsg_XEA6wCY7fxgQMB8eJkUP7dOoX6uLtX5baVfXm1IEQbHAkQg7YzdZreT3un5CwjbQNZlzRoaP17MMlbjHSnGyGFu-7vwVjuS_QIwIsvtEqMmjVOEKkcrYe0iZznGPwDCsM2mJWIF_fwPOAdjyS6SQmtu87c8tWHTmp5mHBeHnzNaKGEfhRVrq5KRlgGLts3eXd_0b-OSVHkyHPE7dVuV)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
