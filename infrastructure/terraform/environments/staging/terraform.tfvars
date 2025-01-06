# Project and Environment Configuration
project     = "attribution-analytics"
environment = "staging"
aws_region  = "us-west-2"

# VPC and Network Configuration
vpc_cidr = "10.1.0.0/16"
availability_zones = [
  "us-west-2a",
  "us-west-2b",
  "us-west-2c"
]

# EKS Configuration
eks_cluster_version = "1.26"
eks_node_groups = {
  app = {
    instance_types = ["t3.xlarge"]
    min_size      = 2
    max_size      = 6
    desired_size  = 3
    disk_size     = 100
    capacity_type = "ON_DEMAND"
    labels = {
      workload = "app"
      environment = "staging"
    }
    taints = []
  }
  processing = {
    instance_types = ["c6i.2xlarge"]
    min_size      = 2
    max_size      = 8
    desired_size  = 4
    disk_size     = 200
    capacity_type = "ON_DEMAND"
    labels = {
      workload = "processing"
      environment = "staging"
    }
    taints = []
  }
  analytics = {
    instance_types = ["r6i.2xlarge"]
    min_size      = 2
    max_size      = 6
    desired_size  = 3
    disk_size     = 300
    capacity_type = "ON_DEMAND"
    labels = {
      workload = "analytics"
      environment = "staging"
    }
    taints = []
  }
}

# Database Configuration
db_instance_class     = "db.r6g.xlarge"
db_allocated_storage  = 500

# Cache Configuration
redis_node_type = "cache.r6g.xlarge"

# Analytics Configuration
clickhouse_instance_type = "r6i.2xlarge"

# Resource Tags
tags = {
  Project     = "attribution-analytics"
  Environment = "staging"
  ManagedBy   = "terraform"
  Owner       = "platform-team"
  CostCenter  = "platform-engineering"
  Compliance  = "data-security"
}

# High Availability Configuration
multi_az_enabled = true
backup_retention_period = 30
performance_insights_enabled = true
monitoring_interval = 30

# Auto Scaling Configuration
autoscaling_enabled = true
max_capacity = 12
min_capacity = 2

# Security Configuration
enable_encryption = true
enable_deletion_protection = true