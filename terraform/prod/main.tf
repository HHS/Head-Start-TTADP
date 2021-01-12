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
    key     = "terraform.tfstate.prod"
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
  service_plan = data.cloudfoundry_service.rds.service_plans["small-psql"]
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
# ClamAV networking
# The following lines should be commented out for the initial `terraform apply`
# run to bootstrap the application.
# Run them after the ttahub and ClamAV apps have all been deployed
###

data "cloudfoundry_app" "clamav_server" {
  name_or_id = var.clamav_server_app_name
  space      = data.cloudfoundry_space.space.id
}

data "cloudfoundry_app" "clamav_rest" {
  name_or_id = var.clamav_rest_app_name
  space      = data.cloudfoundry_space.space.id
}

data "cloudfoundry_app" "ttahub" {
  name_or_id = "tta-smarthub-${var.env}"
  space      = data.cloudfoundry_space.space.id
}

resource "cloudfoundry_network_policy" "clamav_routing" {
  policy {
    source_app      = data.cloudfoundry_app.clamav_rest.id
    destination_app = data.cloudfoundry_app.clamav_server.id
    port            = "3310"
  }
  policy {
    source_app      = data.cloudfoundry_app.ttahub.id
    destination_app = data.cloudfoundry_app.clamav_rest.id
    port            = "8080"
  }
}
