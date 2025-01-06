# Core RDS Instance Configuration Variables
variable "identifier_prefix" {
  description = "Prefix for RDS instance identifiers"
  type        = string
  default     = "attribution-analytics"

  validation {
    condition     = length(var.identifier_prefix) <= 40
    error_message = "The identifier prefix must be 40 characters or less."
  }
}

variable "instance_class" {
  description = "RDS instance class for both primary and replica instances"
  type        = string
  default     = "db.r6g.2xlarge"

  validation {
    condition     = can(regex("^db\\.[a-z0-9]+\\.[a-z0-9xlarge]+$", var.instance_class))
    error_message = "The instance class must be a valid RDS instance type."
  }
}

variable "allocated_storage" {
  description = "Allocated storage size in GB for RDS instances"
  type        = number
  default     = 100

  validation {
    condition     = var.allocated_storage >= 20 && var.allocated_storage <= 65536
    error_message = "Allocated storage must be between 20 GB and 65536 GB."
  }
}

variable "engine_version" {
  description = "PostgreSQL engine version for RDS instances"
  type        = string
  default     = "15.0"

  validation {
    condition     = can(regex("^\\d+\\.\\d+(\\.\\d+)?$", var.engine_version))
    error_message = "Engine version must be in the format 'major.minor' or 'major.minor.patch'."
  }
}

# High Availability Configuration Variables
variable "multi_az" {
  description = "Enable Multi-AZ deployment for high availability"
  type        = bool
  default     = true
}

variable "backup_retention_period" {
  description = "Number of days to retain automated backups"
  type        = number
  default     = 30

  validation {
    condition     = var.backup_retention_period >= 0 && var.backup_retention_period <= 35
    error_message = "Backup retention period must be between 0 and 35 days."
  }
}

variable "enable_performance_insights" {
  description = "Enable Performance Insights for enhanced monitoring"
  type        = bool
  default     = true
}

variable "read_replica_count" {
  description = "Number of read replicas to create"
  type        = number
  default     = 2

  validation {
    condition     = var.read_replica_count >= 0 && var.read_replica_count <= 5
    error_message = "Read replica count must be between 0 and 5."
  }
}

# Network Configuration Variables
variable "vpc_id" {
  description = "ID of the VPC where RDS instances will be deployed"
  type        = string

  validation {
    condition     = can(regex("^vpc-[a-f0-9]+$", var.vpc_id))
    error_message = "VPC ID must be a valid AWS VPC identifier."
  }
}

variable "subnet_ids" {
  description = "List of subnet IDs for RDS subnet group"
  type        = list(string)

  validation {
    condition     = length(var.subnet_ids) >= 2
    error_message = "At least two subnet IDs are required for high availability."
  }
}

variable "security_group_ids" {
  description = "List of security group IDs for RDS instances"
  type        = list(string)

  validation {
    condition     = length(var.security_group_ids) > 0
    error_message = "At least one security group ID must be provided."
  }
}

# Environment Configuration Variable
variable "environment" {
  description = "Deployment environment identifier"
  type        = string

  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be one of: development, staging, production."
  }
}