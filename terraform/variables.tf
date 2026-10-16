variable "aws_region" {
  description = "AWS region for the temporary classroom environment."
  type        = string
  default     = "ap-south-1"
}

variable "cluster_name" {
  description = "Name of the temporary EKS cluster."
  type        = string
  default     = "opsflow-eks"
}

variable "vpc_name" {
  description = "Name of the dedicated OpsFlow VPC."
  type        = string
  default     = "opsflow-vpc"
}

variable "environment" {
  description = "Environment tag. This configuration is intended for a short-lived demo."
  type        = string
  default     = "demo"
}

variable "kubernetes_version" {
  description = "EKS minor version; verify regional standard-support availability before apply."
  type        = string
  default     = "1.36"
}

variable "admin_cidr" {
  description = "Administrator public IPv4 CIDR allowed to access the EKS API, normally the current public IP /32. No unrestricted default."
  type        = string
  nullable    = false

  validation {
    condition     = can(cidrnetmask(var.admin_cidr)) && var.admin_cidr != "0.0.0.0/0"
    error_message = "Provide a valid restricted IPv4 CIDR, normally your public IP /32; 0.0.0.0/0 is not permitted."
  }
}

variable "vpc_cidr" {
  description = "CIDR of the dedicated demo VPC."
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones" {
  description = "Two distinct available AZs in aws_region."
  type        = list(string)
  default     = ["ap-south-1a", "ap-south-1b"]

  validation {
    condition     = length(var.availability_zones) == 2 && length(distinct(var.availability_zones)) == 2
    error_message = "Specify exactly two distinct availability zones."
  }
}

variable "public_subnet_cidrs" {
  description = "Two public subnet CIDRs, corresponding to availability_zones."
  type        = list(string)
  default     = ["10.20.101.0/24", "10.20.102.0/24"]

  validation {
    condition     = length(var.public_subnet_cidrs) == 2 && length(distinct(var.public_subnet_cidrs)) == 2 && alltrue([for cidr in var.public_subnet_cidrs : can(cidrnetmask(cidr))])
    error_message = "Specify exactly two distinct valid IPv4 subnet CIDRs."
  }
}

variable "node_instance_type" {
  description = "On-Demand x86-64 worker type; t3.medium provides 4 GiB for the brief OpsFlow demonstration."
  type        = string
  default     = "t3.medium"
}
