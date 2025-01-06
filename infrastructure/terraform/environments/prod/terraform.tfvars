# Project and Environment Configuration
project     = "attribution-analytics"
environment = "prod"
aws_region  = "us-west-2"

# VPC and Network Configuration
vpc_cidr = "10.0.0.0/16"
availability_zones = [
  "us-west-2a",
  "us-west-2b",
  "us-west-2c"
]

# EKS Cluster Configuration
eks_cluster_version = "1.26"
eks_node_groups = {
  app = {
    instance_types = ["m5.2xlarge"]
    min_size       = 3
    max_size       = 12
    desired_size   = 6
    disk_size      = 100
    labels = {
      workload = "app"
      env      = "prod"
    }
    taints = []
  }
  processing = {
    instance_types = ["c5.4xlarge"]
    min_size       = 3
    max_size       = 12
    desired_size   = 6
    disk_size      = 200
    labels = {
      workload = "processing"
      env      = "prod"
    }
    taints = []
  }
  analytics = {
    instance_types = ["r5.4xlarge"]
    min_size       = 3
    max_size       = 12
    desired_size   = 6
    disk_size      = 300
    labels = {
      workload = "analytics"
      env      = "prod"
    }
    taints = []
  }
}

# Database Configuration
db_instance_class     = "db.r6g.2xlarge"
db_allocated_storage  = 1000
redis_node_type       = "cache.r6g.2xlarge"
clickhouse_instance_type = "r5.4xlarge"

# High Availability Configuration
multi_az_enabled = true
backup_retention_period = 30
performance_insights_enabled = true
monitoring_interval = 30

# Auto Scaling Configuration
autoscaling_enabled = true
max_capacity = 12
min_capacity = 3

# Security Configuration
enable_encryption = true
enable_deletion_protection = true

# Resource Tags
tags = {
  Environment   = "prod"
  Project       = "attribution-analytics"
  ManagedBy     = "terraform"
  Owner         = "data-engineering"
  BusinessUnit  = "marketing-analytics"
  CostCenter    = "marketing-tech"
  DataClass     = "sensitive"
  Compliance    = "gdpr,ccpa"
  OnCall        = "data-platform-team"
}