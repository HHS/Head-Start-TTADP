System Boundary Diagram
=======================

<img src="http://www.plantuml.com/plantuml/png/dLPHRnf747xdLqnvgB0LE3LsNw8e2W5YKu5DVRXMLLTesHlmAilkPMSEZAhyz-uSS71sMbMLR6xPc_bclfblTlb8h08NAzlumJXjYmpXYJcdTqaIrAQpDFnKp0l2eBrZTDpHVfMeB1ZbrhR8YwHtsPvOvVX-F4giOYIEMxDUj5R6OUZaWZtg_dvxFvqz3AVNiz7WQd3JRvqrsB15c4wxaAvKOBWkvZ3tXSjKsCBQuAOnmK3UjVBouT2-WURHz9umDEDErm6wh2qvWby0Fxt0R9uTS39Se_KHhORJF-msQzlh2Ee3L3u4ocLmDHr7FESPGH4Cd0xRd8rtDt6dqRKMj2IgPOkYRsuqOmOg861fAzysiQOm7QNmK-Sj5CuY4VYOTjWOGX3ihDE8qSjbuzE-8Ysr8M7xaCALN_UiBxBc6VpL0AWij6mk_JgQbSjENEzj0D8jCQvcWsSMf9coyrCpi5vbxRcooccfn2vGT_GfigrxLr5cAZSrYEva-2_MmHTSLlxzZrPjCT07EBhkNfB4BPd1P-4Kji11BHP60s5O6urx_6DDs0kDhjO1CyDAwbwzhQW3L79iRJQRc7XUowCkmGUSGpVFhT4bdEHqupFy9Nq3W-Sy8CKstA7IB6_wXl88inE7zjQYPYe1CyMg0-F2iiajWd74Kbk2K3Xdt5Aer7FhpyliCc4qySJBWEcl8-X7eBaYF3Jbhf_ASkz6i1_CVGPkOPP5s1LYuKETsp_6f8izU7e1yq9_GMvM6x9AsGSa8AcmXeMn8dz2fWhnMqF-lpLshMzTfuCq-icZH2gYlXtlImfT0WNfhgMFxj6DFtTXRHHCpGhRdnHX9Xq07s0o_0sq2b7gnq5OafgHKZ8Ddp6xwuudxTZHuDVHBLKgBVjU4w73JK1hjBGIDt0dwqCDZIjyGJ3spaIIPMCYZMXobCg9Uy3S1oPWjBX23bk1OPr3w_BouYowYkF9UNKSjPLoQecLDCIlF6ZXQZ1D9hTf_BYV9lt1Q30TrD0gYDUZ54a_6v4KVYsGcFuxw2kiYkp_1Dtxm_ls1v2kmpiuFrV7jYETdyEZIv8_RaKCR_zCafUrscjcZS4ijc0oyUJjw_0r8bNUrUW4L1abcs0OgImr8KD0xKDMSidfguNMpvSNRx-BGHVVmpXCcG2iSoqtJkwDunDT7gwNLJGxwBCtJ7fzc9WShN7uMfYxwpKQNXcM-PIHkKxR4Yp8OI8JdI68wiYmbpEj3g1Dq1QraLZbiZTy8UoXOrpk3eJ3o5KAFxaGgqmcnTmQUYe3x-fJPNaQpAzMXk79-ozoJPc5AEQG0R2NKmvsxFEAVGbs17bnaVGnjtuBwdZqGloZGciaMXHs1oV04UaZkan-MFmD" alt="rendered boundary diagram">

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
LAYOUT_WITH_LEGEND()
title TTA Smart Hub boundary view
Person(personnel, "Smart Hub User", "An end-user of the TTA Smart Hub")
Person(developer, "Smart Hub Developer", "Smart Hub vendor developers and GTM")
note as EncryptionNote
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Boundary(aws, "AWS GovCloud") {
  Boundary(cloudgov, "cloud.gov") {
    System_Ext(aws_alb, "cloud.gov load-balancer", "AWS ALB")
    System_Ext(cloudgov_api, "cloud.gov API")
    System_Ext(cloudgov_router, "<&layers> cloud.gov routers", "Cloud Foundry traffic service")
    Boundary(atob, "Accreditation Boundary") {
      Container(www_app, "<&layers> TTA Smart Hub Web Application", "NodeJS, Express, React", "Displays and collects TTA data. Multiple instances running")
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
      }
  }
}
System(HSES, "HSES", "Authentication As a Service\n\nMFA via Time-Based App or PIV card")
Boundary(gsa_saas, "FedRAMP-approved SaaS") {
  System_Ext(newrelic, "New Relic", "Continuous Monitoring")
}
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
www_app <-> HSES : **authenticates** \n//[OAuth2]//
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
Rel(www_app, www_db, "reads/writes dataset records", "psql (5432)")
Rel(www_app, www_s3, "reads/writes data content", "vpc endpoint")
Boundary(development_saas, "CI/CD Pipeline") {
  System_Ext(github, "GitHub", "HHS-controlled code repository")
  System_Ext(circleci, "CircleCI", "Continuous Integration Service")
}
Rel(developer, github, "Publish code")
Rel(github, circleci, "Commit hook notifies CircleCI to run CI/CD pipeline")
Rel(circleci, cloudgov_api, "Deploy application on successful CI/CD run")
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/dLPHRnf747xdLqnvgB0LE3LsNw8e2W5YKu5DVRXMLLTesHlmAilkPMSEZAhyz-uSS71sMbMLR6xPc_bclfblTlb8h08NAzlumJXjYmpXYJcdTqaIrAQpDFnKp0l2eBrZTDpHVfMeB1ZbrhR8YwHtsPvOvVX-F4giOYIEMxDUj5R6OUZaWZtg_dvxFvqz3AVNiz7WQd3JRvqrsB15c4wxaAvKOBWkvZ3tXSjKsCBQuAOnmK3UjVBouT2-WURHz9umDEDErm6wh2qvWby0Fxt0R9uTS39Se_KHhORJF-msQzlh2Ee3L3u4ocLmDHr7FESPGH4Cd0xRd8rtDt6dqRKMj2IgPOkYRsuqOmOg861fAzysiQOm7QNmK-Sj5CuY4VYOTjWOGX3ihDE8qSjbuzE-8Ysr8M7xaCALN_UiBxBc6VpL0AWij6mk_JgQbSjENEzj0D8jCQvcWsSMf9coyrCpi5vbxRcooccfn2vGT_GfigrxLr5cAZSrYEva-2_MmHTSLlxzZrPjCT07EBhkNfB4BPd1P-4Kji11BHP60s5O6urx_6DDs0kDhjO1CyDAwbwzhQW3L79iRJQRc7XUowCkmGUSGpVFhT4bdEHqupFy9Nq3W-Sy8CKstA7IB6_wXl88inE7zjQYPYe1CyMg0-F2iiajWd74Kbk2K3Xdt5Aer7FhpyliCc4qySJBWEcl8-X7eBaYF3Jbhf_ASkz6i1_CVGPkOPP5s1LYuKETsp_6f8izU7e1yq9_GMvM6x9AsGSa8AcmXeMn8dz2fWhnMqF-lpLshMzTfuCq-icZH2gYlXtlImfT0WNfhgMFxj6DFtTXRHHCpGhRdnHX9Xq07s0o_0sq2b7gnq5OafgHKZ8Ddp6xwuudxTZHuDVHBLKgBVjU4w73JK1hjBGIDt0dwqCDZIjyGJ3spaIIPMCYZMXobCg9Uy3S1oPWjBX23bk1OPr3w_BouYowYkF9UNKSjPLoQecLDCIlF6ZXQZ1D9hTf_BYV9lt1Q30TrD0gYDUZ54a_6v4KVYsGcFuxw2kiYkp_1Dtxm_ls1v2kmpiuFrV7jYETdyEZIv8_RaKCR_zCafUrscjcZS4ijc0oyUJjw_0r8bNUrUW4L1abcs0OgImr8KD0xKDMSidfguNMpvSNRx-BGHVVmpXCcG2iSoqtJkwDunDT7gwNLJGxwBCtJ7fzc9WShN7uMfYxwpKQNXcM-PIHkKxR4Yp8OI8JdI68wiYmbpEj3g1Dq1QraLZbiZTy8UoXOrpk3eJ3o5KAFxaGgqmcnTmQUYe3x-fJPNaQpAzMXk79-ozoJPc5AEQG0R2NKmvsxFEAVGbs17bnaVGnjtuBwdZqGloZGciaMXHs1oV04UaZkan-MFmD)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
