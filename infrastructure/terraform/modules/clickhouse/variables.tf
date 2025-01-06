# Core cluster configuration variables
variable "cluster_name" {
  type        = string
  description = "Name identifier for the ClickHouse cluster"
}

variable "environment" {
  type        = string
  description = "Deployment environment (dev/staging/prod)"
}

# Networking variables
variable "vpc_id" {
  type        = string
  description = "VPC ID for ClickHouse cluster deployment"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for ClickHouse node deployment"
}

# Instance configuration variables
variable "instance_type" {
  type        = string
  description = "EC2 instance type for ClickHouse nodes"
  default     = "r6g.2xlarge" # Optimized for memory-intensive analytics workloads
}

# Cluster scaling variables
variable "min_size" {
  type        = number
  description = "Minimum number of nodes in ClickHouse cluster"
  default     = 3 # Minimum for high availability
}

variable "max_size" {
  type        = number
  description = "Maximum number of nodes in ClickHouse cluster"
  default     = 12 # Maximum for peak load handling
}

variable "desired_capacity" {
  type        = number
  description = "Desired number of nodes in ClickHouse cluster"
  default     = 6 # Default cluster size for production workloads
}

# Storage configuration variables
variable "volume_size" {
  type        = number
  description = "Size in GB for ClickHouse data volume"
  default     = 1000 # 1TB default for high data volume
}

# Data retention configuration
variable "retention_days" {
  type        = number
  description = "Number of days to retain data in ClickHouse"
  default     = 90 # 90 days active storage as per requirements
}

# Resource tagging variables
variable "tags" {
  type        = map(string)
  description = "Resource tags for ClickHouse infrastructure"
  default = {
    Service     = "analytics-storage"
    Component   = "clickhouse"
    Managed_by  = "terraform"
  }
}

# Performance tuning variables
variable "max_concurrent_queries" {
  type        = number
  description = "Maximum number of concurrent queries allowed"
  default     = 100 # Tuned for high concurrency
}

variable "max_memory_usage" {
  type        = number
  description = "Maximum memory usage per server in bytes"
  default     = 53687091200 # 50GB default for r6g.2xlarge
}

variable "max_insert_threads" {
  type        = number
  description = "Maximum number of threads for parallel insert operations"
  default     = 16 # Optimized for high insert throughput
}

# Backup configuration variables
variable "backup_retention_days" {
  type        = number
  description = "Number of days to retain backups"
  default     = 30 # Monthly backup retention
}

variable "backup_schedule" {
  type        = string
  description = "Cron expression for backup schedule"
  default     = "0 0 * * *" # Daily backups at midnight
}

# Monitoring configuration
variable "enable_enhanced_monitoring" {
  type        = bool
  description = "Enable enhanced CloudWatch monitoring"
  default     = true
}

variable "monitoring_interval" {
  type        = number
  description = "Monitoring interval in seconds"
  default     = 30 # 30-second monitoring intervals
}

# Security configuration
variable "enable_encryption" {
  type        = bool
  description = "Enable encryption at rest"
  default     = true
}

variable "kms_key_id" {
  type        = string
  description = "KMS key ID for encryption"
  default     = "" # Optional: Use default KMS key if not specified
}