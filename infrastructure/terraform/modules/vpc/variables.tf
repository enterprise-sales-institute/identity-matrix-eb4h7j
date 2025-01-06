# VPC name configuration with validation for environment and purpose identification
variable "vpc_name" {
  type        = string
  description = "Name of the VPC to identify environment and purpose (e.g., prod-attribution-vpc)"
  
  validation {
    condition     = can(regex("^[a-z0-9-]+-vpc$", var.vpc_name))
    error_message = "VPC name must be lowercase alphanumeric with hyphens and end with '-vpc'."
  }
}

# VPC CIDR block configuration with recommended size for production workloads
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for the VPC (recommended /16 for production)"
  default     = "10.0.0.0/16"
  
  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0))
    error_message = "VPC CIDR must be a valid IPv4 CIDR block."
  }
  
  validation {
    condition     = tonumber(split("/", var.vpc_cidr)[1]) <= 16
    error_message = "VPC CIDR block must be /16 or larger for production use."
  }
}

# Availability zones configuration for multi-AZ deployment
variable "azs" {
  type        = list(string)
  description = "List of availability zones for multi-AZ deployment (minimum 3 recommended for production)"
  
  validation {
    condition     = length(var.azs) >= 2
    error_message = "At least 2 availability zones are required for high availability."
  }
  
  validation {
    condition     = alltrue([for az in var.azs : can(regex("^[a-z]{2}-[a-z]+-[0-9][a-z]$", az))])
    error_message = "Availability zone names must be in the format: region-az (e.g., us-east-1a)."
  }
}

# Public subnet CIDR blocks configuration
variable "public_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for public subnets (one per AZ, recommended /24 for each)"
  
  validation {
    condition     = length(var.public_subnet_cidrs) >= 2
    error_message = "At least 2 public subnet CIDR blocks are required for high availability."
  }
  
  validation {
    condition     = alltrue([for cidr in var.public_subnet_cidrs : can(cidrhost(cidr, 0))])
    error_message = "All public subnet CIDR blocks must be valid IPv4 CIDR notation."
  }
}

# Private subnet CIDR blocks configuration
variable "private_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for private subnets (one per AZ, recommended /20 for each)"
  
  validation {
    condition     = length(var.private_subnet_cidrs) >= 2
    error_message = "At least 2 private subnet CIDR blocks are required for high availability."
  }
  
  validation {
    condition     = alltrue([for cidr in var.private_subnet_cidrs : can(cidrhost(cidr, 0))])
    error_message = "All private subnet CIDR blocks must be valid IPv4 CIDR notation."
  }
}

# Database subnet CIDR blocks configuration
variable "database_subnet_cidrs" {
  type        = list(string)
  description = "CIDR blocks for database subnets (one per AZ, recommended /23 for each)"
  
  validation {
    condition     = length(var.database_subnet_cidrs) >= 2
    error_message = "At least 2 database subnet CIDR blocks are required for high availability."
  }
  
  validation {
    condition     = alltrue([for cidr in var.database_subnet_cidrs : can(cidrhost(cidr, 0))])
    error_message = "All database subnet CIDR blocks must be valid IPv4 CIDR notation."
  }
}

# NAT Gateway configuration for private subnet internet access
variable "enable_nat_gateway" {
  type        = bool
  description = "Enable NAT Gateway for private subnet internet access"
  default     = true
}

# Single NAT Gateway configuration for cost optimization
variable "single_nat_gateway" {
  type        = bool
  description = "Use a single NAT Gateway instead of one per AZ (not recommended for production)"
  default     = false
}

# Resource tagging configuration with mandatory tags
variable "tags" {
  type        = map(string)
  description = "Tags to apply to all VPC resources"
  default = {
    "Terraform"   = "true"
    "Environment" = "production"
    "Service"     = "attribution-analytics"
  }
  
  validation {
    condition     = contains(keys(var.tags), "Environment") && contains(keys(var.tags), "Service")
    error_message = "Tags must include 'Environment' and 'Service' keys."
  }
  
  validation {
    condition     = alltrue([for k, v in var.tags : can(regex("^[A-Za-z0-9_-]+$", k)) && can(regex("^[A-Za-z0-9_-]+$", v))])
    error_message = "Tag keys and values must be alphanumeric with hyphens and underscores only."
  }
}