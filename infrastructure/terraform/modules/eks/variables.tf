# Core Terraform functionality for variable definitions and validations
terraform {
  required_version = "~> 1.5"
}

# Cluster name variable with validation
variable "cluster_name" {
  description = "Name of the EKS cluster, must be unique within the AWS region"
  type        = string
  
  validation {
    condition     = length(var.cluster_name) <= 40 && can(regex("^[a-zA-Z][a-zA-Z0-9-]*$", var.cluster_name))
    error_message = "Cluster name must be 40 characters or less, start with a letter, and contain only alphanumeric characters and hyphens"
  }
}

# Kubernetes version variable with validation
variable "cluster_version" {
  description = "Kubernetes version for the EKS cluster, must be a supported version"
  type        = string
  default     = "1.26"
  
  validation {
    condition     = can(regex("^[0-9]+\\.[0-9]+$", var.cluster_version))
    error_message = "Cluster version must be in the format X.Y and be a supported EKS version"
  }
}

# VPC ID variable with validation
variable "vpc_id" {
  description = "ID of the VPC where EKS cluster will be deployed, must be a valid VPC with required networking setup"
  type        = string
  
  validation {
    condition     = can(regex("^vpc-[a-z0-9]{8,}$", var.vpc_id))
    error_message = "VPC ID must be a valid AWS VPC identifier"
  }
}

# Subnet IDs variable with validation
variable "subnet_ids" {
  description = "List of subnet IDs for EKS node groups deployment, must be in at least two availability zones"
  type        = list(string)
  
  validation {
    condition     = length(var.subnet_ids) >= 2 && can(regex("^subnet-[a-z0-9]{8,}$", var.subnet_ids[0]))
    error_message = "At least 2 valid subnet IDs are required for high availability"
  }
}

# Node groups configuration variable
variable "node_groups" {
  description = "Configuration for EKS node groups including instance types, scaling parameters, and node labels/taints"
  type = map(object({
    instance_types = list(string)
    min_size      = number
    max_size      = number
    desired_size  = number
    disk_size     = number
    labels        = map(string)
    taints = list(object({
      key    = string
      value  = string
      effect = string
    }))
    capacity_type = string
  }))
  
  default = {
    app = {
      instance_types = ["m5.2xlarge", "m5.4xlarge"]
      min_size      = 3
      max_size      = 10
      desired_size  = 3
      disk_size     = 100
      labels        = {
        role = "application"
      }
      taints        = []
      capacity_type = "ON_DEMAND"
    }
    system = {
      instance_types = ["m5.large"]
      min_size      = 2
      max_size      = 4
      desired_size  = 2
      disk_size     = 50
      labels        = {
        role = "system"
      }
      taints        = []
      capacity_type = "ON_DEMAND"
    }
  }
}

# Private endpoint configuration
variable "enable_private_endpoint" {
  description = "Whether to enable private API server endpoint for enhanced security"
  type        = bool
  default     = true
}

# Encryption configuration
variable "enable_encryption" {
  description = "Whether to enable envelope encryption for secrets using AWS KMS"
  type        = bool
  default     = true
}

# KMS key ARN for encryption
variable "kms_key_arn" {
  description = "ARN of the KMS key for envelope encryption of Kubernetes secrets"
  type        = string
  default     = ""
}

# Resource tagging configuration
variable "tags" {
  description = "Tags to apply to all resources created by this module"
  type        = map(string)
  default = {
    Environment = "production"
    ManagedBy   = "terraform"
    Project     = "attribution-analytics"
  }
}

# Cluster logging configuration
variable "cluster_log_types" {
  description = "List of control plane logging types to enable for audit and monitoring"
  type        = list(string)
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}

# Cluster addons configuration
variable "cluster_addons" {
  description = "Map of cluster addon configurations with versions and conflict resolution"
  type = map(object({
    version           = string
    resolve_conflicts = string
  }))
  
  default = {
    vpc-cni = {
      version           = "v1.12.0"
      resolve_conflicts = "OVERWRITE"
    }
    coredns = {
      version           = "v1.9.3"
      resolve_conflicts = "OVERWRITE"
    }
    kube-proxy = {
      version           = "v1.26.0"
      resolve_conflicts = "OVERWRITE"
    }
    aws-ebs-csi-driver = {
      version           = "v1.13.0"
      resolve_conflicts = "OVERWRITE"
    }
  }
}