System Boundary Diagram
=======================

<img src="http://www.plantuml.com/plantuml/png/dLHHJ-D647wkVyKq3rL0Hwm2VJcTJfSZBhJA0SL6g6ghQBsUX5KtkxwPSKnKyT-xQtnEkAXITNx0mtY-RxwPRpSVM1H9ixR9zyPfsrG8Zo8rlqrJKkraPUInAHj6qju9EfbelqvLHKQvZMtg9hquFxcroidzftcwLYn88RMu2DNAEAH97Rddqzzlxel5mo_5rMAUNMRNi_5H8aOiGb5C8Lyh4hXgIYXzuof5MzWOR9DR9FPkN7SlX_ODZ7Qbzumq2fcf0tJLITG8VWdo-1Ndw2XnNX0KG-OqRMintbs7J3Ar5dGarZ75K65jj605YX2mgut_jM47KCnp-75o2espo0m-jA7MC4BahYP9aD25oST-Wh5gEQfxoE7IRowiRwhH4VoJG7Y66XtJAxy9XLqu2V5GzLs-PS7r8dkIIBPGjjol0-jLTL8ggvn66lMzflEFOM3ednt3q6f1lX6aKFxk1wksIFmUTfml7pcoTPBXvoWr-26abakZWP4sHkDUZzt0ugF0ruPEYvl1r7wotJESad7RjWjLrwzKFJmymBIkhT4g-XCrNViAVytVGFPK4tBOxnqgBV7Bp70TW0pALQ2zjQY58MgfbAWzkS_9GVTPsVMlelfRpx8Yp7-Rmom0IyNuPRLtipo6FOoXln5zHxSqguOwfR3qT706_wihd_Nq-HcKZVuRPJGaOfIB9sHW2TGQbiOYA6OKxZcVa-VanURnLPxb0H5V7KSZZ-YaNnzC6HJaWts3RIjM2rQANuPdKrg4NAcySsl_33fi2OCRqGTiuIx6iSydxunuCcxLuuAYy77dwHwGiFOa388MroYqZGIYQnYVdvyT1MW4xjtttRbVAwTME3WQSTqF5LncHNfxauS_zqKwo-PPaRrY6oWERq1D_iaW0-7d1bdu_vCUSFN3VZDfZuTt9-yX6WXluVXOxHn4FZw6FrsQ_d4JVJtzAqs_tbLl_mR9BBTWgeYKxM7xeUShauORGAWgJbioWjojcb60K7kgkbbg_cnX_DFvsUaXHt-U3pc-N9Q0-82kQjRsNm00" alt="boundary diagram">

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/master/C4_Container.puml
LAYOUT_WITH_LEGEND()
title TTA Smart Hub boundary view
Person(personnel, "Smart Hub User", "An end-user of the TTA Smart Hub")
note as EncryptionNote
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Boundary(aws, "AWS GovCloud") {
    Boundary(cloudgov, "cloud.gov") {
    	System_Ext(aws_alb, "cloud.gov load-balancer", "AWS ALB")
        System_Ext(cloudgov_router, "<&layers> cloud.gov routers", "Cloud Foundry traffic service")
        Boundary(atob, "TTA Smart Hub ATO boundary") {
            Container(www_app, "<&layers> WWW Application", "NodeJS, Express, React", "Displays and collects TTA data")
        }
        ContainerDb(www_db, "PostgreSQL Database", "AWS RDS", "Contains content and configuration for TTA Smart Hub")
        ContainerDb(www_s3, "AWS S3 bucket", "AWS S3", "Stores static file assets")
    }
}
System(HSES, "HSES", "Authentication As a Service")
Boundary(gsa_saas, "Possible SaaS") {
	System_Ext(newrelic, "New Relic", "Monitoring SaaS")
}
Rel(www_app, newrelic, "reports telemetry", "tcp (443)")
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
www_app <-> HSES : **authenticates** \n//[OAuth2]//
Rel(personnel, HSES, "verify identity", "https GET/POST (443)")
Rel(www_app, www_db, "reads/writes dataset records", "psql (5432)")
Rel(www_app, www_s3, "reads/writes data content")
@enduml
```

Instructions
------------

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/uml/dLHHJ-D647wkVyKq3rL0Hwm2VJcTJfSZBhJA0SL6g6ghQBsUX5KtkxwPSKnKyT-xQtnEkAXITNx0mtY-RxwPRpSVM1H9ixR9zyPfsrG8Zo8rlqrJKkraPUInAHj6qju9EfbelqvLHKQvZMtg9hquFxcroidzftcwLYn88RMu2DNAEAH97Rddqzzlxel5mo_5rMAUNMRNi_5H8aOiGb5C8Lyh4hXgIYXzuof5MzWOR9DR9FPkN7SlX_ODZ7Qbzumq2fcf0tJLITG8VWdo-1Ndw2XnNX0KG-OqRMintbs7J3Ar5dGarZ75K65jj605YX2mgut_jM47KCnp-75o2espo0m-jA7MC4BahYP9aD25oST-Wh5gEQfxoE7IRowiRwhH4VoJG7Y66XtJAxy9XLqu2V5GzLs-PS7r8dkIIBPGjjol0-jLTL8ggvn66lMzflEFOM3ednt3q6f1lX6aKFxk1wksIFmUTfml7pcoTPBXvoWr-26abakZWP4sHkDUZzt0ugF0ruPEYvl1r7wotJESad7RjWjLrwzKFJmymBIkhT4g-XCrNViAVytVGFPK4tBOxnqgBV7Bp70TW0pALQ2zjQY58MgfbAWzkS_9GVTPsVMlelfRpx8Yp7-Rmom0IyNuPRLtipo6FOoXln5zHxSqguOwfR3qT706_wihd_Nq-HcKZVuRPJGaOfIB9sHW2TGQbiOYA6OKxZcVa-VanURnLPxb0H5V7KSZZ-YaNnzC6HJaWts3RIjM2rQANuPdKrg4NAcySsl_33fi2OCRqGTiuIx6iSydxunuCcxLuuAYy77dwHwGiFOa388MroYqZGIYQnYVdvyT1MW4xjtttRbVAwTME3WQSTqF5LncHNfxauS_zqKwo-PPaRrY6oWERq1D_iaW0-7d1bdu_vCUSFN3VZDfZuTt9-yX6WXluVXOxHn4FZw6FrsQ_d4JVJtzAqs_tbLl_mR9BBTWgeYKxM7xeUShauORGAWgJbioWjojcb60K7kgkbbg_cnX_DFvsUaXHt-U3pc-N9Q0-82kQjRsNm00)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
