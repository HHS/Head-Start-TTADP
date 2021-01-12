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
  default     = "ttahub-staging"
}

variable "cf_user" {
  type        = string
  description = "secret; cloud.gov deployer account user"
}

variable "env" {
  type        = string
  description = "deployment environment in shortened form (dev, staging, prod)"
  default     = "staging"
}

variable "clamav_server_app_name" {
  type        = string
  description = "app name for clamd server"
  default     = "clamav-server-ttahub-dev"
}

variable "clamav_rest_app_name" {
  type        = string
  description = "app name for clamav api server"
  default     = "clamav-rest-ttahub-dev"
}

variable "cf_dev_space_name" {
  type        = string
  description = "cloud.gov dev space name"
  default     = "ttahub-dev"
}
