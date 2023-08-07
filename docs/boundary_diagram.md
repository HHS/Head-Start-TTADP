System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/svg/jLTRRnkv5NxthpZrG-00AmjDKlI2Oh6of3Wkh4JhKPA7tON08Oz6h3daX1SfGf7_NfwvK2EF7A01-c2Bm-7vle-7F9VvnNbcVIZLnP-avYe8XAttbVl7U6pP_hgGVXlouD1oeprgVyrDEMR2IgPtAbHXF7qpMYgc_SV5_LWnZyx7gVKqhcPIexsk2DjBhn1Mgmcy2pda9cZ1x05s4lSNIxJEwAkg_j6eVeBBRk77o7iPdoSQK8iHoG2p0RzDM9SlEtk1ErGcelJiPztSPMzo5w6CXRJU0TC2RbUBY7NJAhjYUqUydpEuDRkfCa5SleJ_N01a1-Unl8flrjay_YrMotM6TbVppaic5JIFbwrzN1M1JmtVP_4bSN5isAUch1IJshlEBAw14MGopYEyDrvk96TU6krgVCcnHas2EMaip2wQryFhE6ubTzph-LTF6ripbVUNWJ9CZ7AccEP7tPFx6s8uiKuiQrR94uZ9ykuxgwq9ldRGFryeTa3hVeQZQVFI4M_jQ7XBUx87y9Pjugx1zVRRsp7p9YUjd5iKqjVEIM_JrW7ILRpQx_THUDNNaUxaPynXKbMgzJAfUMy4_YkUrFnhPT75-_20Z7jwCvEkYW3DsN6Z57BlQYZ1FBk6HL1Uqi59xJohJza6hQKkuYO6genzHDiAItBgoUSKtGIbw7c9TcDi2JdZZuMbhGEXaQnQ2LJMH79tdfWhLZAwC6-bGd2SrGhfA9kpOENa4utkj4UhcG9sL0EHzsXI1sQew1wv8T4ihpqlSb9id2yiPh_UmomAp9d3xi8zp38QjcOEseJJ-bXlP15iukxdW6SPtUikc5v37lWZ-iiqGQFC6uiE7DqT3Xlo0dCE_VDxe9lcekK3_GvsC5VCHIJ6j_NKhm43WjdqZ-VV9dVWJNDCHhT4toxexzj5coFUnPmHxUcdbXbTh10oMMZue7_NYxSJs4a6ArdYw2Ro2xedO2mixpu1PrRy7bTb9bXUqzzQfZrYBRUVumh7reunHnICPId1fVWjZ8d4Qy-ATSaqA-eGlgqdOSKAM3IJfB7t62c-_UyaqLOTlEJkI37ffeY0uZDD32asA3gQjoWU9elbY5MLDJiKS9vNuzwYafp22lVmGEFk_aaTJ72mC5fwOobwY30kwLUP7a2pSwYQSAI0XnUWJ554KyAiAohSpbVZvOSi_lku6i_cz_FL7AxUl7dzCg8JTafFFMIBbR7UWKU59Nfx83ZFgxvXNzJP8vksqOCGvzqPe-4HV9AuFoPW2X2wsPrjgjLdRJFKme4sUhIykqiWb8-6vaEz0m3I_8priPWrnYa5VzVfFu53JjxOO-uCfGK78_YSPScfsdW4Aukj1wD1IVruCL4AED7ofWWBh2JtA81P1DJS7Yfwsak_XTLz1d--VWL1AtGEZD-YtKk7GBZY-WArg8UqdPIe-lsFC7jDoRJDITuplYrHUtUohvCxa5mnBBgLDLybbI3y4j1vz-FEIMm3adHt_nzi_GgPYXOL7rSxg4T1y73rzsTippTjcfehKXnSsuPGoC5V_lRN5kAisR6FI_PCb58_ZUKsbrlqLk8EuG6vh2HgFxodQS_d05ZmssX5vRULIhOV9d7wrJ0mMgEeL6uE80LP-iFmA1BbZJmXJVNQ8XDklBUIM4cnGmyMkR6YSPNxef9vylMF8_G5kDVdpBk-W6nt5GVKeZ9I-u6A7uOP2EcgFkelLD8TLN6ec6KbTfrhlUGv2Gb0u5a0U06XYgBQNYGC4S_hcHfZXTHaU0mWS25ttCggoLCv-ZsYJfre7pkLqAuOK8xfokZqRZoTmL9MgAJ6OVrilWofMajFJHWrBE-o4RdLKaTCJPj0e0Bcf3VKafy2S6cvGYw9gnvExvxKNseyYxRdInyzmqASb2n3hgJRriG45L-0YyzNhrwrOPLKzybDMKeFMsCU8SLofmYyeTOT6czKoHi4rjl1a--Y6LRA74xwPQF11KxD-2Qe1ew08z8zEwndJwfQC_jGTuBjn6zfnHymigEVuRVsJlnnyGjg4KhrNm00)

UML Source
----------

```
@startuml
!include https://raw.githubusercontent.com/adrianvlupu/C4-PlantUML/latest/C4_Container.puml
title TTA Hub boundary view
Person(personnel, "TTA Hub User", "An end-user of the TTA Hub")
Person(developer, "TTA Hub Developer", "TTA Hub vendor developers and GTM")
Boundary(aws, "AWS GovCloud") {
  System(AWS_SES_SMTP_Server, "Email Server", "AWS SES")
  System(AWS_SNS, "Bounces and Complaints", "AWS SNS - Simple Notifications Service")
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
Rel(worker_app, AWS_SES_SMTP_Server, "notifies users", "port 587")
Rel(AWS_SES_SMTP_Server, AWS_SNS, "notifies admin")
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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/jLTRRnkv5NxthpZrG-00AmjDKlI2Oh6of3Wkh4JhKPA7tON08Oz6h3daX1SfGf7_NfwvK2EF7A01-c2Bm-7vle-7F9VvnNbcVIZLnP-avYe8XAttbVl7U6pP_hgGVXlouD1oeprgVyrDEMR2IgPtAbHXF7qpMYgc_SV5_LWnZyx7gVKqhcPIexsk2DjBhn1Mgmcy2pda9cZ1x05s4lSNIxJEwAkg_j6eVeBBRk77o7iPdoSQK8iHoG2p0RzDM9SlEtk1ErGcelJiPztSPMzo5w6CXRJU0TC2RbUBY7NJAhjYUqUydpEuDRkfCa5SleJ_N01a1-Unl8flrjay_YrMotM6TbVppaic5JIFbwrzN1M1JmtVP_4bSN5isAUch1IJshlEBAw14MGopYEyDrvk96TU6krgVCcnHas2EMaip2wQryFhE6ubTzph-LTF6ripbVUNWJ9CZ7AccEP7tPFx6s8uiKuiQrR94uZ9ykuxgwq9ldRGFryeTa3hVeQZQVFI4M_jQ7XBUx87y9Pjugx1zVRRsp7p9YUjd5iKqjVEIM_JrW7ILRpQx_THUDNNaUxaPynXKbMgzJAfUMy4_YkUrFnhPT75-_20Z7jwCvEkYW3DsN6Z57BlQYZ1FBk6HL1Uqi59xJohJza6hQKkuYO6genzHDiAItBgoUSKtGIbw7c9TcDi2JdZZuMbhGEXaQnQ2LJMH79tdfWhLZAwC6-bGd2SrGhfA9kpOENa4utkj4UhcG9sL0EHzsXI1sQew1wv8T4ihpqlSb9id2yiPh_UmomAp9d3xi8zp38QjcOEseJJ-bXlP15iukxdW6SPtUikc5v37lWZ-iiqGQFC6uiE7DqT3Xlo0dCE_VDxe9lcekK3_GvsC5VCHIJ6j_NKhm43WjdqZ-VV9dVWJNDCHhT4toxexzj5coFUnPmHxUcdbXbTh10oMMZue7_NYxSJs4a6ArdYw2Ro2xedO2mixpu1PrRy7bTb9bXUqzzQfZrYBRUVumh7reunHnICPId1fVWjZ8d4Qy-ATSaqA-eGlgqdOSKAM3IJfB7t62c-_UyaqLOTlEJkI37ffeY0uZDD32asA3gQjoWU9elbY5MLDJiKS9vNuzwYafp22lVmGEFk_aaTJ72mC5fwOobwY30kwLUP7a2pSwYQSAI0XnUWJ554KyAiAohSpbVZvOSi_lku6i_cz_FL7AxUl7dzCg8JTafFFMIBbR7UWKU59Nfx83ZFgxvXNzJP8vksqOCGvzqPe-4HV9AuFoPW2X2wsPrjgjLdRJFKme4sUhIykqiWb8-6vaEz0m3I_8priPWrnYa5VzVfFu53JjxOO-uCfGK78_YSPScfsdW4Aukj1wD1IVruCL4AED7ofWWBh2JtA81P1DJS7Yfwsak_XTLz1d--VWL1AtGEZD-YtKk7GBZY-WArg8UqdPIe-lsFC7jDoRJDITuplYrHUtUohvCxa5mnBBgLDLybbI3y4j1vz-FEIMm3adHt_nzi_GgPYXOL7rSxg4T1y73rzsTippTjcfehKXnSsuPGoC5V_lRN5kAisR6FI_PCb58_ZUKsbrlqLk8EuG6vh2HgFxodQS_d05ZmssX5vRULIhOV9d7wrJ0mMgEeL6uE80LP-iFmA1BbZJmXJVNQ8XDklBUIM4cnGmyMkR6YSPNxef9vylMF8_G5kDVdpBk-W6nt5GVKeZ9I-u6A7uOP2EcgFkelLD8TLN6ec6KbTfrhlUGv2Gb0u5a0U06XYgBQNYGC4S_hcHfZXTHaU0mWS25ttCggoLCv-ZsYJfre7pkLqAuOK8xfokZqRZoTmL9MgAJ6OVrilWofMajFJHWrBE-o4RdLKaTCJPj0e0Bcf3VKafy2S6cvGYw9gnvExvxKNseyYxRdInyzmqASb2n3hgJRriG45L-0YyzNhrwrOPLKzybDMKeFMsCU8SLofmYyeTOT6czKoHi4rjl1a--Y6LRA74xwPQF11KxD-2Qe1ew08z8zEwndJwfQC_jGTuBjn6zfnHymigEVuRVsJlnnyGjg4KhrNm00)
2. Copy and paste the final UML into the UML Source section
3. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
