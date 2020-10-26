###
# Terraform settings and backend
###

terraform {
  required_providers {
    cloudfoundry = {
      source  = "cloudfoundry-community/cloudfoundry"
      version = "0.12.6"
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
  region  = var.aws_region
  version = "~> 3.11.0"
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
