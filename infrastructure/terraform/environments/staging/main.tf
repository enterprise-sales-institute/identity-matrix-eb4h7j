# Configure Terraform settings and required providers
terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket         = "mta-analytics-terraform-state"
    key            = "environments/staging/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "mta-analytics-terraform-locks"
  }
}

# Configure AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "staging"
      Project     = "attribution-analytics"
      ManagedBy   = "terraform"
    }
  }
}

# Root module configuration for staging environment
module "root_module" {
  source = "../../"

  # Environment configuration
  environment = "staging"
  aws_region = var.aws_region

  # VPC Configuration
  vpc_cidr = var.vpc_cidr
  availability_zones = var.availability_zones

  # EKS Configuration
  eks_cluster_version = var.eks_cluster_version
  eks_node_groups = {
    app = {
      instance_types = ["t3.large"]
      scaling_config = {
        desired_size = 3
        min_size     = 2
        max_size     = 5
      }
      disk_size      = 100
      labels = {
        Environment = "staging"
        NodeGroup   = "app"
      }
      taints = []
    }
    processing = {
      instance_types = ["t3.xlarge"]
      scaling_config = {
        desired_size = 2
        min_size     = 2
        max_size     = 4
      }
      disk_size      = 200
      labels = {
        Environment = "staging"
        NodeGroup   = "processing"
      }
      taints = []
    }
  }

  # RDS Configuration
  db_instance_class = var.db_instance_class
  db_allocated_storage = var.db_allocated_storage
  db_backup_retention_period = 7
  multi_az_enabled = true
  performance_insights_enabled = true
  monitoring_interval = 30
  enable_deletion_protection = false

  # Redis Configuration
  redis_node_type = var.redis_node_type
  redis_num_cache_nodes = 2
  enable_encryption = true

  # ClickHouse Configuration
  clickhouse_instance_type = var.clickhouse_instance_type
  clickhouse_node_count = 3

  # Common Tags
  tags = {
    Environment     = "staging"
    Project         = "attribution-analytics"
    ManagedBy       = "terraform"
    CostCenter      = "staging-infrastructure"
    DataClassification = "confidential"
  }
}

# Outputs
output "vpc_id" {
  description = "VPC ID for staging environment"
  value       = module.root_module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.root_module.eks.cluster_endpoint
}

output "rds_endpoint" {
  description = "RDS instance endpoint"
  value       = module.root_module.rds.endpoint
  sensitive   = true
}

output "redis_endpoint" {
  description = "Redis cluster endpoint"
  value       = module.root_module.elasticache.endpoint
}

output "clickhouse_endpoints" {
  description = "ClickHouse cluster endpoints"
  value       = module.root_module.clickhouse.endpoint
}