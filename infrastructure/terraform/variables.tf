# Project Information
variable "project" {
  type        = string
  description = "Project name for resource naming and tagging"
  default     = "mta-analytics"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod)"
  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

# AWS Configuration
variable "aws_region" {
  type        = string
  description = "AWS region for resource deployment"
}

# Networking
variable "vpc_cidr" {
  type        = string
  description = "CIDR block for VPC"
}

variable "availability_zones" {
  type        = list(string)
  description = "List of availability zones for multi-AZ deployment"
}

# EKS Configuration
variable "eks_cluster_version" {
  type        = string
  description = "Kubernetes version for EKS cluster"
  default     = "1.26"
}

variable "eks_node_groups" {
  type = map(object({
    instance_types = list(string)
    min_size       = number
    max_size       = number
    desired_size   = number
    disk_size      = number
    labels         = map(string)
    taints        = list(object({
      key    = string
      value  = string
      effect = string
    }))
  }))
  description = "Configuration for EKS node groups"
}

# RDS Configuration
variable "db_instance_class" {
  type        = string
  description = "RDS instance type for PostgreSQL"
}

variable "db_allocated_storage" {
  type        = number
  description = "Storage allocation for RDS in GB"
}

# ElastiCache Configuration
variable "redis_node_type" {
  type        = string
  description = "ElastiCache Redis node type"
}

# ClickHouse Configuration
variable "clickhouse_instance_type" {
  type        = string
  description = "EC2 instance type for ClickHouse nodes"
}

# Common Tags
variable "tags" {
  type        = map(string)
  description = "Common resource tags for all infrastructure components"
  default = {
    Terraform   = "true"
    Application = "mta-analytics"
  }
}

# Additional Variables for High Availability
variable "multi_az_enabled" {
  type        = bool
  description = "Enable Multi-AZ deployment for supported services"
  default     = true
}

variable "backup_retention_period" {
  type        = number
  description = "Number of days to retain backups"
  default     = 30
}

variable "performance_insights_enabled" {
  type        = bool
  description = "Enable Performance Insights for RDS"
  default     = true
}

variable "monitoring_interval" {
  type        = number
  description = "Enhanced monitoring interval in seconds"
  default     = 30
}

# Auto Scaling Configuration
variable "autoscaling_enabled" {
  type        = bool
  description = "Enable auto scaling for supported services"
  default     = true
}

variable "max_capacity" {
  type        = number
  description = "Maximum capacity for auto scaling"
  default     = 12
}

variable "min_capacity" {
  type        = number
  description = "Minimum capacity for auto scaling"
  default     = 2
}

# Security Configuration
variable "enable_encryption" {
  type        = bool
  description = "Enable encryption at rest for supported services"
  default     = true
}

variable "enable_deletion_protection" {
  type        = bool
  description = "Enable deletion protection for critical resources"
  default     = true
}