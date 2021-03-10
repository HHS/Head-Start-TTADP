###
# Terraform settings and backend
###

terraform {
  required_providers {
    cloudfoundry = {
      source  = "cloudfoundry-community/cloudfoundry"
      version = "0.12.6"
    }

    aws = {
      version = "~> 3.11.0"
    }
  }

  backend "s3" {
    bucket  = "cg-77510827-41f7-4b13-aa6b-c292afe85b25"
    key     = "terraform.tfstate.staging"
    encrypt = true
    region  = "us-gov-west-1"
  }
}

provider "cloudfoundry" {
  api_url      = var.cf_api_url
  user         = var.cf_user
  password     = var.cf_password
  app_logs_max = 30
}

provider "aws" {
  region = var.aws_region
}

###
# Target space/org
###

data "cloudfoundry_space" "space" {
  org_name = var.cf_org_name
  name     = var.cf_space_name
}

###
# RDS instance
###

data "cloudfoundry_service" "rds" {
  name = "aws-rds"
}

resource "cloudfoundry_service_instance" "database" {
  name         = "ttahub-${var.env}"
  space        = data.cloudfoundry_space.space.id
  service_plan = data.cloudfoundry_service.rds.service_plans["micro-psql"]
}

###
# S3 bucket
###

data "cloudfoundry_service" "s3" {
  name = "s3"
}

resource "cloudfoundry_service_instance" "document_upload_bucket" {
  name         = "ttahub-document-upload-${var.env}"
  space        = data.cloudfoundry_space.space.id
  service_plan = data.cloudfoundry_service.s3.service_plans["basic"]
}

###
# Redis cache
###

data "cloudfoundry_service" "elasticache" {
  name = "aws-elasticache-redis"
}

resource "cloudfoundry_service_instance" "redis" {
  name         = "ttahub-redis-${var.env}"
  space        = data.cloudfoundry_space.space.id
  service_plan = data.cloudfoundry_service.elasticache.service_plans["redis-dev"]
}

###
# ClamAV networking
# Connects staging app to dev rest api
###

data "cloudfoundry_space" "dev_space" {
  org_name = var.cf_org_name
  name     = var.cf_dev_space_name
}

data "cloudfoundry_app" "clamav_api" {
  name_or_id = var.clamav_api_app_name
  space      = data.cloudfoundry_space.dev_space.id
}

data "cloudfoundry_app" "ttahub" {
  name_or_id = "tta-smarthub-${var.env}"
  space      = data.cloudfoundry_space.space.id
}

resource "cloudfoundry_network_policy" "clamav_routing" {
  policy {
    source_app      = data.cloudfoundry_app.ttahub.id
    destination_app = data.cloudfoundry_app.clamav_api.id
    port            = "9443"
  }
}
