System Boundary Diagram
=======================

<img src="http://www.plantuml.com/plantuml/png/fLPVRrgv4d_dKypDGqMb1dIJt9UhrQeaq3IhqB8vj7sf51cV0QpwsAUUCHIj-jtNunmEdD2jThLI5CnuvZSpl_bZNXEhmB6olVyOfsqi4TRCDVr_E0ngErWPNiT590pQEqR70-sheIg3KMvZOns7DrVdCwiSVvZU3wrY94wYnvkahOp3CAW5cmrRXFby14MLtC7Rk825ZwvKOGSRWzlU30Dvrw_pXqFx2iuEgXy8mrcIZ1oWAyyb7F1BuFKppBENUvmIDsXzGklWZFVIiuvuaq1zWDQ6GBaIRkVJXESy8oY2YTDXLxFnxbsIz4RMWfP0jOWesTP6CvQW0W9cNVcsJVJ1_Bw0_muk83gBHE1Js65h246moq4lUS_7tdN3I5zjIRBzLC2jtznO7ykpb_173w3Lq29S-KrIoyT1EZSw0CME6Al7oJSMf4Tb5yTgOBqgpnVAAgSRMfEZqVrrohPhtNfvLBNfG8ncTp_H3ZvoPlwN5rRjCD2lS31zkYJncpE3Dv9Js047jLmQ3OHXOpGs-0TEs4iQ8wq3beQLyDxUjga3j9tNtswtAV2w4qUt1J_X0aPrROtES1BJEr_YRyKhc7oh0r8gmmCgpN8pDbGdcAVcqDvQr4mPi5Ii1Z2Dbarj4OmZ5cu9GdJEk5LEfHkRjgfIKhqt9bcGLbanyvg9KTNeevpk76Dmoe8wX0bB7mucUHXYBKMbnj7tNiVPU96fA8M-cITU1In-luUnOhLGXFiEU1WNScpC29g1Rz9rIxEAeVL_CdS_yaYN3NHn2Okelo2VjG8v5Um34f0KKyDIc514o9A7PF6zzzHT_RV5f4Zwyf7jKjv9jp0h1-_TPpTzCuADKJ0t5PvVAy9IgWe-mEpk8sWLoiz9g_0nQ9IzSHkKOyJCG7BLjjYAr2CfHL8MB1z6qzbveZtuJG8ib2fobtLQtk4se3LQ6WUty23dFOd6HHy9fjuPzY6tGSeegHmlfoE0gN9gXP34YTzA6WXUWFMhLJ8LpBoMuNOo7yxU5-dVX_bmFBcVp2VGlxgwV9dG1Rjf-WvomDe79c2qM267dS2nhZk6Hvlti3Ig75FRvFyi32d_yJul_TP9cpQLPbPwNQ5Zwi1sODf8JdTB7Vmt8pE6NoCIqz-FxGIhvUnVWBOOxMJBX5BEzGX687vir_HuG0u6DzWswGdlFpLNaTVeM3O54iJctNm_IkABqq8tHXiCPha3KuebxqwJRbrUcuxJTgq4L2KDjy68LucOa26Wzg7CoTVqrKB_VrUN5t-1GfS_Gjdl887Or5eU_zeRnyT3smoJDD9-U6_kXZTZc9aQhN5uEhNvHus4VMjOjfUibhV5kJWBijTbtvK8CZPasClpqWNG9cYBseYlVBovUpRrihTNpReisWVjPFpRI6PnOGsjisE1IXT0wNl_ug8fTHlriNDVLKbnxVqNS9xDKdft7n6mbmS8djYeMpOos07asHi_njhwNUUvINyKjKQYPRGDN09EIFTgzpX-jZcUf0_Dpiw2r-ZAMDa_0G00" alt="rendered boundary diagram">

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
    }
    ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
    ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/fLPVRrgv4d_dKypDGqMb1dIJt9UhrQeaq3IhqB8vj7sf51cV0QpwsAUUCHIj-jtNunmEdD2jThLI5CnuvZSpl_bZNXEhmB6olVyOfsqi4TRCDVr_E0ngErWPNiT590pQEqR70-sheIg3KMvZOns7DrVdCwiSVvZU3wrY94wYnvkahOp3CAW5cmrRXFby14MLtC7Rk825ZwvKOGSRWzlU30Dvrw_pXqFx2iuEgXy8mrcIZ1oWAyyb7F1BuFKppBENUvmIDsXzGklWZFVIiuvuaq1zWDQ6GBaIRkVJXESy8oY2YTDXLxFnxbsIz4RMWfP0jOWesTP6CvQW0W9cNVcsJVJ1_Bw0_muk83gBHE1Js65h246moq4lUS_7tdN3I5zjIRBzLC2jtznO7ykpb_173w3Lq29S-KrIoyT1EZSw0CME6Al7oJSMf4Tb5yTgOBqgpnVAAgSRMfEZqVrrohPhtNfvLBNfG8ncTp_H3ZvoPlwN5rRjCD2lS31zkYJncpE3Dv9Js047jLmQ3OHXOpGs-0TEs4iQ8wq3beQLyDxUjga3j9tNtswtAV2w4qUt1J_X0aPrROtES1BJEr_YRyKhc7oh0r8gmmCgpN8pDbGdcAVcqDvQr4mPi5Ii1Z2Dbarj4OmZ5cu9GdJEk5LEfHkRjgfIKhqt9bcGLbanyvg9KTNeevpk76Dmoe8wX0bB7mucUHXYBKMbnj7tNiVPU96fA8M-cITU1In-luUnOhLGXFiEU1WNScpC29g1Rz9rIxEAeVL_CdS_yaYN3NHn2Okelo2VjG8v5Um34f0KKyDIc514o9A7PF6zzzHT_RV5f4Zwyf7jKjv9jp0h1-_TPpTzCuADKJ0t5PvVAy9IgWe-mEpk8sWLoiz9g_0nQ9IzSHkKOyJCG7BLjjYAr2CfHL8MB1z6qzbveZtuJG8ib2fobtLQtk4se3LQ6WUty23dFOd6HHy9fjuPzY6tGSeegHmlfoE0gN9gXP34YTzA6WXUWFMhLJ8LpBoMuNOo7yxU5-dVX_bmFBcVp2VGlxgwV9dG1Rjf-WvomDe79c2qM267dS2nhZk6Hvlti3Ig75FRvFyi32d_yJul_TP9cpQLPbPwNQ5Zwi1sODf8JdTB7Vmt8pE6NoCIqz-FxGIhvUnVWBOOxMJBX5BEzGX687vir_HuG0u6DzWswGdlFpLNaTVeM3O54iJctNm_IkABqq8tHXiCPha3KuebxqwJRbrUcuxJTgq4L2KDjy68LucOa26Wzg7CoTVqrKB_VrUN5t-1GfS_Gjdl887Or5eU_zeRnyT3smoJDD9-U6_kXZTZc9aQhN5uEhNvHus4VMjOjfUibhV5kJWBijTbtvK8CZPasClpqWNG9cYBseYlVBovUpRrihTNpReisWVjPFpRI6PnOGsjisE1IXT0wNl_ug8fTHlriNDVLKbnxVqNS9xDKdft7n6mbmS8djYeMpOos07asHi_njhwNUUvINyKjKQYPRGDN09EIFTgzpX-jZcUf0_Dpiw2r-ZAMDa_0G00)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
