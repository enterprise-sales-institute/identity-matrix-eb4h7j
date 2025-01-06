# Provider configuration for development environment
terraform {
  required_version = ">= 1.5.0"
  
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

# AWS Provider configuration
provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = "attribution-analytics"
      ManagedBy   = "terraform"
    }
  }
}

# VPC Module for development environment
module "vpc" {
  source = "../../modules/vpc"

  vpc_name = "attribution-analytics-${var.environment}"
  vpc_cidr = var.vpc_cidr
  azs      = ["${var.region}a", "${var.region}b"] # Dev uses 2 AZs for cost optimization

  # Development subnet configuration with smaller CIDR blocks
  public_subnet_cidrs   = [cidrsubnet(var.vpc_cidr, 8, 0), cidrsubnet(var.vpc_cidr, 8, 1)]
  private_subnet_cidrs  = [cidrsubnet(var.vpc_cidr, 8, 2), cidrsubnet(var.vpc_cidr, 8, 3)]
  database_subnet_cidrs = [cidrsubnet(var.vpc_cidr, 8, 4), cidrsubnet(var.vpc_cidr, 8, 5)]

  # Development environment optimizations
  enable_nat_gateway = true
  single_nat_gateway = true # Single NAT for cost savings in dev

  tags = {
    Environment = var.environment
    Purpose     = "development"
  }
}

# EKS Module for development environment
module "eks" {
  source = "../../modules/eks"

  cluster_name    = "attribution-analytics-${var.environment}"
  cluster_version = "1.26"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  # Development-appropriate node groups
  node_groups = {
    app = {
      instance_types = var.eks_node_instance_types
      min_size      = 1
      max_size      = 3
      desired_size  = 2
      disk_size     = 50
      labels = {
        role = "application"
      }
      taints        = []
      capacity_type = "SPOT" # Use spot instances for cost savings in dev
    }
  }

  # Development environment configurations
  enable_private_endpoint = false
  enable_encryption      = true
  cluster_log_types      = ["api", "audit"]

  tags = {
    Environment = var.environment
  }
}

# RDS Module for development environment
module "rds" {
  source = "../../modules/rds"

  identifier_prefix = "attribution-${var.environment}"
  instance_class    = "db.t3.large" # Smaller instance for dev
  allocated_storage = 50
  engine_version    = "15.0"

  # Development high-availability settings
  multi_az               = false
  backup_retention_period = 7
  read_replica_count     = 0

  # Network configuration
  vpc_id             = module.vpc.vpc_id
  subnet_ids         = module.vpc.database_subnet_ids
  security_group_ids = [module.vpc.default_security_group_id]

  environment = var.environment
}

# ElastiCache Module for development environment
module "elasticache" {
  source = "../../modules/elasticache"

  cluster_name = "attribution-${var.environment}"
  node_type    = "cache.t3.medium" # Smaller instance for dev
  
  # Development cluster configuration
  num_cache_nodes = 1 # Single node for dev
  engine_version  = "7.0"
  port           = 6379

  # Network configuration
  vpc_id     = module.vpc.vpc_id
  subnet_ids = module.vpc.private_subnet_ids

  # Development-appropriate settings
  maintenance_window      = "sun:05:00-sun:09:00"
  snapshot_retention_limit = 3
  snapshot_window         = "03:00-05:00"

  parameter_group_family = "redis7.0"
  security_group_ids     = [module.vpc.default_security_group_id]
}

# ClickHouse Module for development environment
module "clickhouse" {
  source = "../../modules/clickhouse"

  cluster_name = "attribution-${var.environment}"
  environment  = var.environment
  
  # Network configuration
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.private_subnet_ids

  # Development instance configuration
  instance_type     = "r6g.xlarge" # Smaller instance for dev
  min_size         = 1
  max_size         = 2
  desired_capacity = 1
  volume_size      = 100

  # Development-appropriate settings
  retention_days        = 30
  backup_retention_days = 7
  max_concurrent_queries = 50
  max_memory_usage      = 26843545600 # 25GB for dev

  enable_enhanced_monitoring = true
  enable_encryption         = true

  tags = {
    Environment = var.environment
  }
}

# Output values for development environment
output "vpc_id" {
  description = "VPC ID for development environment"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint for development environment"
  value       = module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS instance endpoint for development environment"
  value       = module.rds.primary_endpoint
}

output "redis_endpoint" {
  description = "Redis cluster endpoint for development environment"
  value       = module.elasticache.endpoint
}

output "clickhouse_endpoint" {
  description = "ClickHouse cluster endpoint for development environment"
  value       = module.clickhouse.endpoint
}