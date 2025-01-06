# Project and Environment
project     = "attribution-analytics"
environment = "dev"
aws_region  = "us-west-2"

# Networking Configuration
vpc_cidr            = "10.0.0.0/16"
availability_zones  = ["us-west-2a", "us-west-2b"]

# EKS Configuration
eks_cluster_version = "1.26"
eks_node_groups = {
  app = {
    instance_types = ["t3.medium"]
    min_size       = 2
    max_size       = 4
    desired_size   = 2
    disk_size      = 50
    labels = {
      role = "app"
    }
    taints = []
  }
  processing = {
    instance_types = ["t3.large"]
    min_size       = 2
    max_size       = 4
    desired_size   = 2
    disk_size      = 100
    labels = {
      role = "processing"
    }
    taints = []
  }
}

# Database Configuration
db_instance_class     = "db.t3.medium"
db_allocated_storage  = 50

# Cache Configuration
redis_node_type = "cache.t3.medium"

# Analytics Configuration
clickhouse_instance_type = "t3.xlarge"

# High Availability Configuration
multi_az_enabled           = true
backup_retention_period    = 7
performance_insights_enabled = true
monitoring_interval        = 60

# Auto Scaling Configuration
autoscaling_enabled = true
max_capacity        = 4
min_capacity        = 2

# Security Configuration
enable_encryption          = true
enable_deletion_protection = false

# Resource Tags
tags = {
  Environment = "dev"
  Project     = "attribution-analytics"
  ManagedBy   = "terraform"
  Team        = "platform"
  CostCenter  = "engineering"
}