System Boundary Diagram
=======================

![rendered boundary diagram](http://www.plantuml.com/plantuml/png/dLPVRniv3d_Ff-3beN209iQbVRd3uL0dTjCiagsRSTkN0e56Gu-rqKYgADdrBlhTLvJ7Ou_TB8e2RQoHo1z_5FzGRoW87sAZJ_wbZDInGbY4uEY_mw4NgujQXKKi8w6NrWGquKBQPYWghuHPwkZYyFhr-LGB4pxUtmsr24WXRJrU9scX3FeBnzX11OqmcusWQ98vU1TBA6qqbV1hM2fSdKpHapK3btyCwfTmkXFzIEXFqyx809hgdEc0dKDO762UdcrnAboYjWcjXpFUxfxsjfS9r7heT0Y4gU1cTf_mhbgM0x4YPl2vW1kxlDOsLgTdyDS9G2SXUREsooIMbnTftSe056iAs3nElWL6UXIwt1S3RKLrNWejZ4piMaEZkwl4eA_TMNaKJlKWHjFRVv3sDePy6_zxeSKQFVqVTggRGsAxsJDuopxvDGGlvdCbWT0lbSGMVtSdmPRCLKgFbGeYA6kwqyvrW2uR1glLAX5tFHxzjFYC9OoSqqfcEERqkwtmj-8bJBuvZvJ2y8121ZuPAt89PXCmQRL66IW3LYA82xYFEYYd4PIXm7TBuACnojJioY4twv_Gj_GEIEMZvtXTHQtvUuf-Rdq3fP1FjUTh0CRCv9WFE6yb4ltOlDIY4PmyRvL682aopnpM71VHZ3xnwjO4z4Pe43isaEpkL79zHCSvHSU6ncMEGbKoOqkXzbXyk8En2A8KXDlaUnWNl6pL2DhwRs_Qp5KTVMUx7yDdRTAh5hnu1MMKJnXEkurSai5w923E90bplWT1XE5vBpZlk2uV-FV8XuaMb924NEIj3n4ZWftl1-WFMn84kmcKDQsXxoVyVoyus0Yb7xaCq3Du8_wq1WhLS79D-12AV0Y3ObASiRNP8bce5p3paUYqJIbEfYozWKhclfziodNmBYacAVx9Tw5ChJ6Pg0syDr_C_TiHB9M0cMhm_4eGLfoEO3rCRp-15BxwagGA6xtCFZwWL4wX2VbMzZjPJUAHX21EDQmUHlVJS-6Sjyi4MGXHvCBjTH63AuzQISvvNC43hxV9eKoqaU3U6XMiJwIpJqbalmVl0TmB8se4jwaLhabu0ThMTL9bp3nzu6Oo6qxV5-dFnzbmFBcRp2OmUFtwrLb2P-osZ_IGFJhh0q50ZGq6lsQu85rFSM_0xFfmapbrVUFdQ1WR4Bog5m6i0QtCqyb8Qv2CBham22fqIWQiG7W4DDAl7N-jL4XfSLV0loyk8HgDH6330lrA4GBZLXSdQAgyPDPTyUoFnygk39TuMoSXf3Hlq0JgqUyvttbyF1QSjzyKjqVy6f42_NmeZh2wsFmwQAyNTusH6nnbT_UG60K6_tb6joqgZy4hNEAkAeu3VPXVFG0Hmo9fSRj5WjY-HzwFqlRbSMQrIalqQhu6LR5cM1zxtvcyKZsZNN_sA2eQhhnYgyoOC817QNr53EVeg-xKMxz_7Q5FWFFjM7qx1rXtwIIWgPnL9Xon-6MOGo9TZqUJiYWYSSy69xneSFjgoI8758u1AlmX0Bo0w1AfTlB47cBNDTjknXMsxPxNjyFhCKoLGwqC7hVDpUCv2Twem6EHk_kxufnTzrPhv45Q8N3V8XKiFvdw059vgL4gjfMNrxS7RPSV0tKxXulkaNRKVpicqrXgHOjicA7I0L3w7bnUjgdViTutRfic2IwiVUAUfEPSr5j642puQ61p6wwxZGos0pbujuxHQRlklM7IFufI8j4ywXOk0H-cnC4eBj1KFPXCiFsWLhclqrNgpwZVYVNZ-61iR7OVyiXkDzuadDZelm40)

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
System(HSES, "HSES", "Single Sign On\nMFA via Time-Based App or PIV card\n\nSource of Recipient Data")
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
Rel(worker_app, clamav, "scans files", "https POST (9443)")
Rel(worker_app, HSES, "retrieve Recipient data", "https GET (443)")
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

1. [Edit this diagram with plantuml.com](http://www.plantuml.com/plantuml/umla/dLPVRniv3d_Ff-3beN209iQbVRd3uL0dTjCiagsRSTkN0e56Gu-rqKYgADdrBlhTLvJ7Ou_TB8e2RQoHo1z_5FzGRoW87sAZJ_wbZDInGbY4uEY_mw4NgujQXKKi8w6NrWGquKBQPYWghuHPwkZYyFhr-LGB4pxUtmsr24WXRJrU9scX3FeBnzX11OqmcusWQ98vU1TBA6qqbV1hM2fSdKpHapK3btyCwfTmkXFzIEXFqyx809hgdEc0dKDO762UdcrnAboYjWcjXpFUxfxsjfS9r7heT0Y4gU1cTf_mhbgM0x4YPl2vW1kxlDOsLgTdyDS9G2SXUREsooIMbnTftSe056iAs3nElWL6UXIwt1S3RKLrNWejZ4piMaEZkwl4eA_TMNaKJlKWHjFRVv3sDePy6_zxeSKQFVqVTggRGsAxsJDuopxvDGGlvdCbWT0lbSGMVtSdmPRCLKgFbGeYA6kwqyvrW2uR1glLAX5tFHxzjFYC9OoSqqfcEERqkwtmj-8bJBuvZvJ2y8121ZuPAt89PXCmQRL66IW3LYA82xYFEYYd4PIXm7TBuACnojJioY4twv_Gj_GEIEMZvtXTHQtvUuf-Rdq3fP1FjUTh0CRCv9WFE6yb4ltOlDIY4PmyRvL682aopnpM71VHZ3xnwjO4z4Pe43isaEpkL79zHCSvHSU6ncMEGbKoOqkXzbXyk8En2A8KXDlaUnWNl6pL2DhwRs_Qp5KTVMUx7yDdRTAh5hnu1MMKJnXEkurSai5w923E90bplWT1XE5vBpZlk2uV-FV8XuaMb924NEIj3n4ZWftl1-WFMn84kmcKDQsXxoVyVoyus0Yb7xaCq3Du8_wq1WhLS79D-12AV0Y3ObASiRNP8bce5p3paUYqJIbEfYozWKhclfziodNmBYacAVx9Tw5ChJ6Pg0syDr_C_TiHB9M0cMhm_4eGLfoEO3rCRp-15BxwagGA6xtCFZwWL4wX2VbMzZjPJUAHX21EDQmUHlVJS-6Sjyi4MGXHvCBjTH63AuzQISvvNC43hxV9eKoqaU3U6XMiJwIpJqbalmVl0TmB8se4jwaLhabu0ThMTL9bp3nzu6Oo6qxV5-dFnzbmFBcRp2OmUFtwrLb2P-osZ_IGFJhh0q50ZGq6lsQu85rFSM_0xFfmapbrVUFdQ1WR4Bog5m6i0QtCqyb8Qv2CBham22fqIWQiG7W4DDAl7N-jL4XfSLV0loyk8HgDH6330lrA4GBZLXSdQAgyPDPTyUoFnygk39TuMoSXf3Hlq0JgqUyvttbyF1QSjzyKjqVy6f42_NmeZh2wsFmwQAyNTusH6nnbT_UG60K6_tb6joqgZy4hNEAkAeu3VPXVFG0Hmo9fSRj5WjY-HzwFqlRbSMQrIalqQhu6LR5cM1zxtvcyKZsZNN_sA2eQhhnYgyoOC817QNr53EVeg-xKMxz_7Q5FWFFjM7qx1rXtwIIWgPnL9Xon-6MOGo9TZqUJiYWYSSy69xneSFjgoI8758u1AlmX0Bo0w1AfTlB47cBNDTjknXMsxPxNjyFhCKoLGwqC7hVDpUCv2Twem6EHk_kxufnTzrPhv45Q8N3V8XKiFvdw059vgL4gjfMNrxS7RPSV0tKxXulkaNRKVpicqrXgHOjicA7I0L3w7bnUjgdViTutRfic2IwiVUAUfEPSr5j642puQ61p6wwxZGos0pbujuxHQRlklM7IFufI8j4ywXOk0H-cnC4eBj1KFPXCiFsWLhclqrNgpwZVYVNZ-61iR7OVyiXkDzuadDZelm40)
1. Copy and paste the final UML into the UML Source section
1. Update the img src and edit link target to the current values

### Notes

* See the help docs for [C4 variant of PlantUML](https://github.com/RicardoNiepel/C4-PlantUML) for syntax help.
