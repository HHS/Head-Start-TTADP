# Secrets to be provided via environment variables or
# in `secrets.auto.tfvars.` When provided via environment
# variables, the names must be prefixed with `TF_VAR_`
# Ex. `TF_VAR_cf_user="foobarbaz"`
# For more information on generating values secret variables
# see terraform/README.md.

variable "aws_region" {
  type        = string
  description = "region output by cloud foundry service-key command"
  default     = "us-gov-west-1"
}

variable "cf_api_url" {
  type        = string
  description = "cloud.gov api url"
  default     = "https://api.fr.cloud.gov"
}

variable "cf_org_name" {
  type        = string
  description = "cloud.gov organization name"
  default     = "hhs-acf-ohs-tta"
}

variable "cf_password" {
  type        = string
  description = "secret; cloud.gov deployer account password"
}

variable "cf_space_name" {
  type        = string
  description = "cloud.gov space name"
  default     = "ttahub-prod"
}

variable "cf_user" {
  type        = string
  description = "secret; cloud.gov deployer account user"
}

variable "env" {
  type        = string
  description = "deployment environment in shortened form (dev, staging, prod)"
  default     = "prod"
}

variable "clamav_api_app_name" {
  type        = string
  description = "app name for clamav api server"
  default     = "clamav-api-ttahub-prod"
}

variable "prod_url" {
  type        = string
  description = "Production URL endpoint"
  default     = "ttahub.ohs.acf.hhs.gov"
}
