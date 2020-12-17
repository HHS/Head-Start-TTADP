System Boundary Diagram
=======================

<img src="http://www.plantuml.com/plantuml/png/fLPVRnit37_tf-3oKBX0OsD9zZ8CGvtOJJF4hPTpsvS2WQoZRQ4wwIfITeoXttsYSZx_yLfi6934CaN-IFxuHtbDh0B7odP-CaxRM28icMlwjTyFQjrR65x6MIGCsZj6nptjgxugWr5kPMCT-pTNvnEh77yOt_UjOYHEeiURfAsCmz2h1PiDMuJfT015bTp1spY3cO-kL643AuFhpWG3UTUjyuT3-mhETgeVal-p91auG5UUIpZWvy3B8yopbrkS4bTeVK8xm1bkfMS7ubK2zG5Q6mBbIhYTZXEUyuoW24PEXqtDnhjtIT8PM0jQ0jKYecHR6yrOWWe8c7NbsphH1zFx0dxkNK1q5ed0fx33sX22O9UzJlAUZvthXf6kMfDa-wc0Mx-wiJwMPo_Xhmv0gw55kF2hf9QFlNHkT02A3J5MZwCd5gH7PMVxQc2zAizdoYgdCnFPqU3-EcLxQDrwULIrEO0OJEv-e1ryvCpyRo-isc2Wts5d-dn9uZTd1cyafx013ce-Dne8myfeRF1tdB2VIQnQ1omDA-6zlMrJ1sWxhxjUhrFWzNuSHotu2MSmg6jhT8QJcDxv4lyeNi7egGv8gGmFg3JBpT1GdM2UcqDxQr4pPS1IiUh1E5esjKKmZbYu9GZHEUCMaifHRDggIadrtfXaGLfbnSnh9aPLWuzokdECmIaBQXScp7tOcUHXYBKKbKuT3MUPXbAectZYHS3YptiOAbOpHRYj_iEma6DZHj0CUvEgcvj53AtlGnA_wvCk6_3Y4cPHVq4-QmLoAjW7920ffOQvyA28a7TPVEl8xxVESuzrtnQZ8jd9HxPFsIURmYmSl7UVtVZD05P6mTHKU7wj24kfBVW0axkFe5KeFoUjmiUWKRR7RL2E4JCNoMNRQ0jIZwGKIN6mV1YC9-U9_E1N2R1GgiYzTj3u3jS1hT7IFhY61pblwJGk-aWmziwaV7Cpf8oIolwAsWCOAwSM24cScAwaZU05MBzO95F1pCiPRaVJ_kHzaVvycFQ7e_lHT0JTgwlBbmbTiDlMtqCEMFl018mMA-Im4JZMzRxX_lxThOugnzIs-dyBGzfWVwkNVksaMPkACokzhD0n7S0UmBIHd6wOElWd8vE6NoCIqx-FxGIhvUn_WBOOxNpBd5BETGz68FxPhkdnW1mChh1jqXFUVsYk8Y_HiUmB98ZDw_b-aCGNnuLkZLOOp7m3fXHBtfmctRgyDWTEsmKJK9NKNmSZNYLYGeQ0seSo9r_JLmlTNwukBxw38hroYhBTHWAngZMWAsjl7EyFRJDCqaZRuRsvwzyCOM9gjCRXwTJcVsqax5l3iiTajRmjpiLPaEqkcwz4aB4XmruUcKC0ROAsg8tuoiURkwEfb-szQ1PdqJvh9-FVHZA9CsjecHqBLBe0Ij-x5nTDgTkezvtxgagAI--_WFDivjAxsuY0lJn3yCn6tRAHmNOWHo_z46lhDmUFJlgXg3KIpQDju19mGhfNcyVXqUPubZuqEpiBNgChOsN_1W00" alt="rendered boundary diagram">

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
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
      Container(clamav, "File scanning API", "ClamAV", "Internal application for scanning user uploads")
      ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
      ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
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
Rel(www_s3, personnel, "download file attachments", "https GET (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(www_app, clamav, "scans files", "https POST (443)")
Rel(www_app, HSES, "retrieve Grantee data", "https GET (443)")
Rel(www_app, HSES, "authenticates user", "OAuth2")
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
BiRel(www_app, www_db, "reads/writes dataset records", "psql (5432)")
BiRel(www_app, www_s3, "reads/writes data content", "vpc endpoint")
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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/fLPVRnit37_tf-3oKBX0OsD9zZ8CGvtOJJF4hPTpsvS2WQoZRQ4wwIfITeoXttsYSZx_yLfi6934CaN-IFxuHtbDh0B7odP-CaxRM28icMlwjTyFQjrR65x6MIGCsZj6nptjgxugWr5kPMCT-pTNvnEh77yOt_UjOYHEeiURfAsCmz2h1PiDMuJfT015bTp1spY3cO-kL643AuFhpWG3UTUjyuT3-mhETgeVal-p91auG5UUIpZWvy3B8yopbrkS4bTeVK8xm1bkfMS7ubK2zG5Q6mBbIhYTZXEUyuoW24PEXqtDnhjtIT8PM0jQ0jKYecHR6yrOWWe8c7NbsphH1zFx0dxkNK1q5ed0fx33sX22O9UzJlAUZvthXf6kMfDa-wc0Mx-wiJwMPo_Xhmv0gw55kF2hf9QFlNHkT02A3J5MZwCd5gH7PMVxQc2zAizdoYgdCnFPqU3-EcLxQDrwULIrEO0OJEv-e1ryvCpyRo-isc2Wts5d-dn9uZTd1cyafx013ce-Dne8myfeRF1tdB2VIQnQ1omDA-6zlMrJ1sWxhxjUhrFWzNuSHotu2MSmg6jhT8QJcDxv4lyeNi7egGv8gGmFg3JBpT1GdM2UcqDxQr4pPS1IiUh1E5esjKKmZbYu9GZHEUCMaifHRDggIadrtfXaGLfbnSnh9aPLWuzokdECmIaBQXScp7tOcUHXYBKKbKuT3MUPXbAectZYHS3YptiOAbOpHRYj_iEma6DZHj0CUvEgcvj53AtlGnA_wvCk6_3Y4cPHVq4-QmLoAjW7920ffOQvyA28a7TPVEl8xxVESuzrtnQZ8jd9HxPFsIURmYmSl7UVtVZD05P6mTHKU7wj24kfBVW0axkFe5KeFoUjmiUWKRR7RL2E4JCNoMNRQ0jIZwGKIN6mV1YC9-U9_E1N2R1GgiYzTj3u3jS1hT7IFhY61pblwJGk-aWmziwaV7Cpf8oIolwAsWCOAwSM24cScAwaZU05MBzO95F1pCiPRaVJ_kHzaVvycFQ7e_lHT0JTgwlBbmbTiDlMtqCEMFl018mMA-Im4JZMzRxX_lxThOugnzIs-dyBGzfWVwkNVksaMPkACokzhD0n7S0UmBIHd6wOElWd8vE6NoCIqx-FxGIhvUn_WBOOxNpBd5BETGz68FxPhkdnW1mChh1jqXFUVsYk8Y_HiUmB98ZDw_b-aCGNnuLkZLOOp7m3fXHBtfmctRgyDWTEsmKJK9NKNmSZNYLYGeQ0seSo9r_JLmlTNwukBxw38hroYhBTHWAngZMWAsjl7EyFRJDCqaZRuRsvwzyCOM9gjCRXwTJcVsqax5l3iiTajRmjpiLPaEqkcwz4aB4XmruUcKC0ROAsg8tuoiURkwEfb-szQ1PdqJvh9-FVHZA9CsjecHqBLBe0Ij-x5nTDgTkezvtxgagAI--_WFDivjAxsuY0lJn3yCn6tRAHmNOWHo_z46lhDmUFJlgXg3KIpQDju19mGhfNcyVXqUPubZuqEpiBNgChOsN_1W00)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
