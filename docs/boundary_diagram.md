System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/svg/fLTHRnk_3N_Ff-3oK3X04sDfNpOCGvtOJJCagvjpsvS2Xav7dxNefAiesVM6VlU9ybdnsStGvG-qjOuIV_oHeaZs7NdXV6ZqoP-KaJfK24llM_hhSEZ4-g9MVXdAGEYaDHwDlv2s6OhAAM5MEhHXUFtsVAg5yP_lxuPQU2GVHVFhU5eeW-wYPMoll4QOpKPGDC9v-11AA6qmbN0RM2bSdqpHaJM3DlqOrA_XzEdePq9t6YKZ0sYgSwO3TW5-UO1vUhR3gN25saQq7ivu9ptjYLSHr3h8EWJ2L70pkuzuLntBWLWJC_XQm8rTNMiRgjCp-Cy9G3uXMLZRLJoMbXTntPq1A3RaiPbFVdX6cWjTxXy3RKLrNWejZ4piag7HtLLaqDVELkQYLJs8qVJsVvnsDlWKZR-zqcA3ZluEJwhRJMAxoJDuppwv3NWd5WibWT2jbCGE_oactfRCLKg7bVB2AsloRdOT86V3OBrUH-9jZqS_BRvY2QEsrKecEERqJrlXFuhNCFdHEgHu3GyefEUTiQ8smcmlJ5gjKNfAW9NmuWBkW_QgrGZAaEVO4hXWZ38rktB8pRf7T1sz0r9fwpbULq5h_fwYMrZNG2daO-qu3C2OJ2xnWTPPYKI_DY-rQ0Gdptkb4KYAn3DTQxeNqOo-yEhMU7H6Q11FR23QVL99xoEqd5DqR6XSfbkeIcPioTSEYqztC1PUb89mbtmFuuANdHf1z_wxI9k5geFBjljt-AnDUjE15s-W3F8H_MaMyAhmrY41SIP9M70S117wvxtWlEDt-S2_HpvCjA289EGoYJu530XsiNz1_x8bWRVRYxAcC_JpXF_kNGusGkavFmDq3Dw8Vri3XMeukIQy2KNQX44nASxOscmPBTHBcBb0TDgb52TJEhs5YkP-dcoVw-13L8od-2V5GfbQOpHH6_XelfdxzoDOAG4prU3vbI2iE1t1EfZUVW4fNFKjdYfiS3BvUEE4yOWf9ljrh2On9o684mshXz7zz5oqhREh25W8KQHdswiX1jSEjPASyRY61rxlKaEPO0F1lJNAMxTDx9z_n5XjRQrnBepG6wyaQzua4Ons8hRDLI8Bair8Qx_gxv6-Zs0rGhjzdLm5u1LeMzUHBcEbVWStazbm-h68_toU3SUJkybi0eEtRz-SHNJ6xYfN3zbXQvqdyAYnGUys3ETbcnKFIFt2kIyArxdCfiGdtda1hsFmp6-D9IcFEpkTvbwlVMf9JGfMBg6_nyDOZ-1KlVHW3MXb7az6MeDaTCarWg32LacF5GY7W4QwJSjVQ-MNCBihuCyNbn2CHYAmVebkhGY1SQkB4pHLMZBhN4Vs9uNAhWrNkwvaU2_aia7Z-s7iXIrxVDmXMsT_A2Hm-3qW-V_ZBewmykMy7BJNbdAFu5fFoTqz94Q1mL-UqUtgYqFl5Aum5uYZQpvChvww27w9XekgHuBG3MOVHr5yUPXNMMc5JYqse2hMz9jZtxF9AzKpcXkLGr7HSEqKMsN6X1uSIkigOhYMlkkidhr-CKAF06VRiVgk8RBkgfKycBPM6N_4uiKmXqHoiqCJSoWWSVE2LZZHu6vyIqSEA1m3LFXB07W5eOsakXOSUeYvfdVrZD_NhhPVtmwlnp1LBMfbyBYeR_yNmQLSUPuFkCrzACxPTST36qyK5GANArBUykpO1v3AIOrIiQsqlBuzw40y5TNTG5BaQVMeBMGcqr1gHSjacA7Y1b3y7bnUTgcVMUyRjqsZF2ojVUIAf1Ryf7UCm5kUBc4RZJP78u4zWHmCy6DijTtqXhduXuAKIBG8keEBm8SfSJ2J56Yg7amYs7rGfzpNoI_rTzJln6O-FcWQM-b3DxiamRk84nhzNm00)

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
 Container(email_server, "Amazon Simple Email Server (SES)", "Through Truss", "TTA Hub mail server")
}
System(HSES, "HSES", "Single Sign On\nMFA via Time-Based App or PIV card\n\nSource of Grantee Data")
Boundary(gsa_saas, "FedRAMP-approved SaaS") {
  System_Ext(newrelic, "New Relic", "Continuous Monitoring")
}
Boundary(gsa_saas, "FedRAMP-approved SaaS") {
  System_Ext(google_analytics, "Google Analytics", "Web Analytics")
}
Rel(developer, newrelic, "Manage performance & logging", "https GET/POST/PUT/DELETE (443)")
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(developer, google_analytics, "View traffic statistics", "https GET/POST/PUT/DELETE (443)")
Rel(www_app, google_analytics, "reports website traffic")
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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/fLTHRnk_3N_Ff-3oK3X04sDfNpOCGvtOJJCagvjpsvS2Xav7dxNefAiesVM6VlU9ybdnsStGvG-qjOuIV_oHeaZs7NdXV6ZqoP-KaJfK24llM_hhSEZ4-g9MVXdAGEYaDHwDlv2s6OhAAM5MEhHXUFtsVAg5yP_lxuPQU2GVHVFhU5eeW-wYPMoll4QOpKPGDC9v-11AA6qmbN0RM2bSdqpHaJM3DlqOrA_XzEdePq9t6YKZ0sYgSwO3TW5-UO1vUhR3gN25saQq7ivu9ptjYLSHr3h8EWJ2L70pkuzuLntBWLWJC_XQm8rTNMiRgjCp-Cy9G3uXMLZRLJoMbXTntPq1A3RaiPbFVdX6cWjTxXy3RKLrNWejZ4piag7HtLLaqDVELkQYLJs8qVJsVvnsDlWKZR-zqcA3ZluEJwhRJMAxoJDuppwv3NWd5WibWT2jbCGE_oactfRCLKg7bVB2AsloRdOT86V3OBrUH-9jZqS_BRvY2QEsrKecEERqJrlXFuhNCFdHEgHu3GyefEUTiQ8smcmlJ5gjKNfAW9NmuWBkW_QgrGZAaEVO4hXWZ38rktB8pRf7T1sz0r9fwpbULq5h_fwYMrZNG2daO-qu3C2OJ2xnWTPPYKI_DY-rQ0Gdptkb4KYAn3DTQxeNqOo-yEhMU7H6Q11FR23QVL99xoEqd5DqR6XSfbkeIcPioTSEYqztC1PUb89mbtmFuuANdHf1z_wxI9k5geFBjljt-AnDUjE15s-W3F8H_MaMyAhmrY41SIP9M70S117wvxtWlEDt-S2_HpvCjA289EGoYJu530XsiNz1_x8bWRVRYxAcC_JpXF_kNGusGkavFmDq3Dw8Vri3XMeukIQy2KNQX44nASxOscmPBTHBcBb0TDgb52TJEhs5YkP-dcoVw-13L8od-2V5GfbQOpHH6_XelfdxzoDOAG4prU3vbI2iE1t1EfZUVW4fNFKjdYfiS3BvUEE4yOWf9ljrh2On9o684mshXz7zz5oqhREh25W8KQHdswiX1jSEjPASyRY61rxlKaEPO0F1lJNAMxTDx9z_n5XjRQrnBepG6wyaQzua4Ons8hRDLI8Bair8Qx_gxv6-Zs0rGhjzdLm5u1LeMzUHBcEbVWStazbm-h68_toU3SUJkybi0eEtRz-SHNJ6xYfN3zbXQvqdyAYnGUys3ETbcnKFIFt2kIyArxdCfiGdtda1hsFmp6-D9IcFEpkTvbwlVMf9JGfMBg6_nyDOZ-1KlVHW3MXb7az6MeDaTCarWg32LacF5GY7W4QwJSjVQ-MNCBihuCyNbn2CHYAmVebkhGY1SQkB4pHLMZBhN4Vs9uNAhWrNkwvaU2_aia7Z-s7iXIrxVDmXMsT_A2Hm-3qW-V_ZBewmykMy7BJNbdAFu5fFoTqz94Q1mL-UqUtgYqFl5Aum5uYZQpvChvww27w9XekgHuBG3MOVHr5yUPXNMMc5JYqse2hMz9jZtxF9AzKpcXkLGr7HSEqKMsN6X1uSIkigOhYMlkkidhr-CKAF06VRiVgk8RBkgfKycBPM6N_4uiKmXqHoiqCJSoWWSVE2LZZHu6vyIqSEA1m3LFXB07W5eOsakXOSUeYvfdVrZD_NhhPVtmwlnp1LBMfbyBYeR_yNmQLSUPuFkCrzACxPTST36qyK5GANArBUykpO1v3AIOrIiQsqlBuzw40y5TNTG5BaQVMeBMGcqr1gHSjacA7Y1b3y7bnUTgcVMUyRjqsZF2ojVUIAf1Ryf7UCm5kUBc4RZJP78u4zWHmCy6DijTtqXhduXuAKIBG8keEBm8SfSJ2J56Yg7amYs7rGfzpNoI_rTzJln6O-FcWQM-b3DxiamRk84nhzNm00)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
