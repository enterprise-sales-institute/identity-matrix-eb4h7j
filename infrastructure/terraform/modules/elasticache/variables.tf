# AWS ElastiCache Redis cluster configuration variables
# Terraform module version: 1.5+
# AWS Provider version: >= 4.0.0

variable "vpc_id" {
  type        = string
  description = "ID of the VPC where ElastiCache cluster will be deployed for network isolation"
}

variable "subnet_ids" {
  type        = list(string)
  description = "List of subnet IDs for multi-AZ ElastiCache deployment to ensure high availability"
}

variable "cluster_name" {
  type        = string
  description = "Name identifier for the ElastiCache Redis cluster"
}

variable "node_type" {
  type        = string
  description = "Instance type for Redis nodes (e.g., cache.t3.medium, cache.r5.large) to meet performance requirements"
  default     = "cache.r5.large" # Recommended for production workloads with < 5s latency requirements
}

variable "num_cache_nodes" {
  type        = number
  description = "Number of cache nodes in the cluster for high availability and performance"
  default     = 3 # Recommended minimum for production high-availability
}

variable "engine_version" {
  type        = string
  description = "Redis engine version to be used for the cluster"
  default     = "7.0" # Latest stable Redis version with enhanced performance features
}

variable "port" {
  type        = number
  description = "Port number for Redis cluster access"
  default     = 6379 # Default Redis port
}

variable "parameter_group_family" {
  type        = string
  description = "Redis parameter group family for cluster configuration"
  default     = "redis7.0" # Matches engine version default
}

variable "tags" {
  type        = map(string)
  description = "Resource tags for ElastiCache cluster management and organization"
  default = {
    Environment = "production"
    Service     = "cache-layer"
    Managed_by  = "terraform"
  }
}

variable "maintenance_window" {
  type        = string
  description = "Preferred maintenance window for cluster updates and maintenance"
  default     = "sun:05:00-sun:09:00" # Off-peak maintenance window
}

variable "snapshot_retention_limit" {
  type        = number
  description = "Number of days to retain automatic cache cluster snapshots"
  default     = 7 # Week-long retention for recovery purposes
}

variable "snapshot_window" {
  type        = string
  description = "Daily time range when automated snapshots are created"
  default     = "03:00-05:00" # Early morning snapshot window
}

variable "apply_immediately" {
  type        = bool
  description = "Whether changes should be applied immediately or during maintenance window"
  default     = false # Safer default for production environments
}

variable "auto_minor_version_upgrade" {
  type        = bool
  description = "Enable/disable automatic minor version upgrades during maintenance window"
  default     = true # Keep up with latest security patches and bug fixes
}

variable "notification_topic_arn" {
  type        = string
  description = "ARN of SNS topic for cluster notifications and alerts"
  default     = null # Optional notification configuration
}

variable "security_group_ids" {
  type        = list(string)
  description = "List of security group IDs to associate with the cluster"
}

variable "parameter_group_parameters" {
  type = list(object({
    name  = string
    value = string
  }))
  description = "List of Redis parameter group parameters for performance optimization"
  default = [
    {
      name  = "maxmemory-policy"
      value = "volatile-lru" # Optimized for session cache use case
    },
    {
      name  = "maxmemory-samples"
      value = "10" # Balanced sampling for LRU algorithm
    },
    {
      name  = "timeout"
      value = "300" # 5-minute connection timeout
    }
  ]
}