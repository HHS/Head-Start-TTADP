System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/svg/fLTVRzis47_tfxZbeKY1EiRIxc73KDI9dTH3lBgHspwqXK5JPvaBJQhaqQunzBkF9ycC4YL3rpqaeawyt_sEl3_dLvw4ex3HlP-KaJha26kYqlys63YnEoaKhSCoU7JI6a939z9k1Y9tIfYj3cKOdB_epxGmz6vwDT22q5CKBSxZRg4CkfEIiKcHHfZFX_0wB65fWyc5syDMuQutG-UjEIwhXq7z38uE6zzvT4VnVMW0JTvd6c1NGEk4TVJqe9_Z5hMDA2tzqK5sr19k8vHraFPx42Q7o_aqOfqrp8x5phFT3nbSsksvjY4_UWf_zm3I3id2mcxZjcfv4jVD7e1ixmatY_5NOgI5qClsDj1MvFsbqC98vbOR6bwTHGPtjPELXIZL7OZXRF8lkvqDL9t4xq-qsAFpB-5MjVxesMxb6LomJsuFvCHgfIHuT5ibiS6_FHEoI-OgfSDSaI1bJVgQN0T8Tt-ys-qYyRBD8mN11rp2i2oraXKGi_dJvlX7zWp6Nqk7Fbx0DGf9_6MaV1a1wgkILckKv2keN90uWMdGf4gDe8mdFbKFBXYZJ16TwB2oxWPTGopHgOIFCJeBMlFx3DtAkWqiXRmf7BiEZCQqAYPGEXkD-uSDIoqsWWFcGca4BqN5aA-olWkn6RxdrSGGEYCqY5is4EtUgbIP44gE8zyrD5fM9vylcR7rL3ZCtbx1I91O2e-7WBiUPRnir3mq6TwSiLcf8hXakvrqZrhqpnlex3aiWxn1Eae2NcLa7Nhm73iILdmAmdkanttWIEDClEPdnuEn5ZuY2RckH6y31WIxQb_FNtRfWMnzJTOqXhxr-EzRhywTuzUliqKsdSyM6RfjbJVZZL0QwbU6ZZkWBGDQH_nY3HDdpSmwYi07i6oSHGr-L3uhKsY4J1K6tfXFPdenXAqIC5SRx9y9Zpa77LW7iybxaCBbd-Akp0OdArykdJ24MFdUhb255milX6SJGcHD_hMAGM5jDBmWKImsmeYYykko4i9S532jXSonzHfDVFllHgAktfEI_jR4y21Y0vpiIT0riSByOEO2y-lXTDONPUdi5dDusAx1dKEj9ESexk2QruTWLYROu65gZIBhE1NPODpIxX4jWDfpAElSvke1Jq3ReeYgZ5drGxWSpmUpDrdyzsu-68slnlCn7BzuyVnfH6ViLEjQo0vBwyW3eSODajip7CcohTWczU2LdJUfY13b_b6bzXMyLxXBrRpADawJWsxgj0_gPcXo3yQQ_cmoII1StBhgNRuT0ERyYFPjPwoLKpt_laCtbX2SAjO4re1MvgOtr1eaeqikMz4kbaeIvY0S0XhfzYM_xHIjONwLmSydfn2CHk_1qXhTJda4nirFUcZoQiciKt5h3ocvtHakm4qT8n9olK53_WxzErUTFEuswjBPhuhR5du9wCb_V-1ri58a_W_GTezCROlRZw_SRI4n2Xp_-eXkjx8QIsh5f89lXX3E4JZzvNuUDNNK8Jc5MuHhbAfKQAWR8otgNG0HQ1srk8ysLbdtpJ2AJxj1sIX5hcgr1vMp9ksx1vTCdgaxHbFZTIXoFzWvnLQPiKS2XzAwlFRQVz59FHtPZoEq2N2eTjKF3PvrjwNaaRgqob2NnO_2T8WSsZUQBzoRFRTZA8KJ6poCeDMMnoWaW1mV180d4Cf8gXagGXinjPX3iUJaFBIPyydWV0GpLQ9M1hlzfVxTmzrC4KyyzGZGPzSTZvyy8UK8NE2z8ilpxrq0gPpKA1NRgfRdatlzYQUyeXcmiZHnTnfLOZ8BIwtykZBCKF43-FX-V7hQX7vYtJPkDnj5iBRs1bBg7HW1MPwJeJwDCfq6WxKykFSZP8Ibjlixmwaru8FaoNSLT0t7m17fIkmNetjLlvPUDvDI9VYOTdo6lkk_X8zD77tklKAJXut-1m00)

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
Rel(personnel, aws_alb, "manage TTA data", "https GET/POST/PUT/DELETE (443)")
note right on link
All connections depicted are encrypted with TLS 1.2 unless otherwise noted.
end note
Rel(www_s3, personnel, "download file attachments", "https GET (443)")
Rel(aws_alb, cloudgov_router, "proxies requests", "https GET/POST/PUT/DELETE (443)")
Rel(cloudgov_router, www_app, "proxies requests", "https GET/POST/PUT/DELETE (443)")
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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/fLTVRzis47_tfxZbeKY1EiRIxc73KDI9dTH3lBgHspwqXK5JPvaBJQhaqQunzBkF9ycC4YL3rpqaeawyt_sEl3_dLvw4ex3HlP-KaJha26kYqlys63YnEoaKhSCoU7JI6a939z9k1Y9tIfYj3cKOdB_epxGmz6vwDT22q5CKBSxZRg4CkfEIiKcHHfZFX_0wB65fWyc5syDMuQutG-UjEIwhXq7z38uE6zzvT4VnVMW0JTvd6c1NGEk4TVJqe9_Z5hMDA2tzqK5sr19k8vHraFPx42Q7o_aqOfqrp8x5phFT3nbSsksvjY4_UWf_zm3I3id2mcxZjcfv4jVD7e1ixmatY_5NOgI5qClsDj1MvFsbqC98vbOR6bwTHGPtjPELXIZL7OZXRF8lkvqDL9t4xq-qsAFpB-5MjVxesMxb6LomJsuFvCHgfIHuT5ibiS6_FHEoI-OgfSDSaI1bJVgQN0T8Tt-ys-qYyRBD8mN11rp2i2oraXKGi_dJvlX7zWp6Nqk7Fbx0DGf9_6MaV1a1wgkILckKv2keN90uWMdGf4gDe8mdFbKFBXYZJ16TwB2oxWPTGopHgOIFCJeBMlFx3DtAkWqiXRmf7BiEZCQqAYPGEXkD-uSDIoqsWWFcGca4BqN5aA-olWkn6RxdrSGGEYCqY5is4EtUgbIP44gE8zyrD5fM9vylcR7rL3ZCtbx1I91O2e-7WBiUPRnir3mq6TwSiLcf8hXakvrqZrhqpnlex3aiWxn1Eae2NcLa7Nhm73iILdmAmdkanttWIEDClEPdnuEn5ZuY2RckH6y31WIxQb_FNtRfWMnzJTOqXhxr-EzRhywTuzUliqKsdSyM6RfjbJVZZL0QwbU6ZZkWBGDQH_nY3HDdpSmwYi07i6oSHGr-L3uhKsY4J1K6tfXFPdenXAqIC5SRx9y9Zpa77LW7iybxaCBbd-Akp0OdArykdJ24MFdUhb255milX6SJGcHD_hMAGM5jDBmWKImsmeYYykko4i9S532jXSonzHfDVFllHgAktfEI_jR4y21Y0vpiIT0riSByOEO2y-lXTDONPUdi5dDusAx1dKEj9ESexk2QruTWLYROu65gZIBhE1NPODpIxX4jWDfpAElSvke1Jq3ReeYgZ5drGxWSpmUpDrdyzsu-68slnlCn7BzuyVnfH6ViLEjQo0vBwyW3eSODajip7CcohTWczU2LdJUfY13b_b6bzXMyLxXBrRpADawJWsxgj0_gPcXo3yQQ_cmoII1StBhgNRuT0ERyYFPjPwoLKpt_laCtbX2SAjO4re1MvgOtr1eaeqikMz4kbaeIvY0S0XhfzYM_xHIjONwLmSydfn2CHk_1qXhTJda4nirFUcZoQiciKt5h3ocvtHakm4qT8n9olK53_WxzErUTFEuswjBPhuhR5du9wCb_V-1ri58a_W_GTezCROlRZw_SRI4n2Xp_-eXkjx8QIsh5f89lXX3E4JZzvNuUDNNK8Jc5MuHhbAfKQAWR8otgNG0HQ1srk8ysLbdtpJ2AJxj1sIX5hcgr1vMp9ksx1vTCdgaxHbFZTIXoFzWvnLQPiKS2XzAwlFRQVz59FHtPZoEq2N2eTjKF3PvrjwNaaRgqob2NnO_2T8WSsZUQBzoRFRTZA8KJ6poCeDMMnoWaW1mV180d4Cf8gXagGXinjPX3iUJaFBIPyydWV0GpLQ9M1hlzfVxTmzrC4KyyzGZGPzSTZvyy8UK8NE2z8ilpxrq0gPpKA1NRgfRdatlzYQUyeXcmiZHnTnfLOZ8BIwtykZBCKF43-FX-V7hQX7vYtJPkDnj5iBRs1bBg7HW1MPwJeJwDCfq6WxKykFSZP8Ibjlixmwaru8FaoNSLT0t7m17fIkmNetjLlvPUDvDI9VYOTdo6lkk_X8zD77tklKAJXut-1m00)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
