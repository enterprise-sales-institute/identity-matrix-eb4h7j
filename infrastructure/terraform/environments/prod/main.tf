# Provider configuration for AWS with version constraint
terraform {
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
  }

  backend "s3" {
    bucket         = "attribution-analytics-tfstate"
    key            = "prod/terraform.tfstate"
    region         = "us-west-2"
    encrypt        = true
    dynamodb_table = "attribution-analytics-tfstate-lock"
  }
}

# AWS Provider configuration
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = "production"
      Project     = "attribution-analytics"
      ManagedBy   = "terraform"
    }
  }
}

# VPC Module for production environment
module "vpc" {
  source = "../../modules/vpc"

  vpc_name = "attribution-prod-vpc"
  vpc_cidr = "10.0.0.0/16"
  
  availability_zones = ["us-west-2a", "us-west-2b", "us-west-2c"]
  
  public_subnet_cidrs = [
    "10.0.0.0/24",
    "10.0.1.0/24",
    "10.0.2.0/24"
  ]
  
  private_subnet_cidrs = [
    "10.0.10.0/23",
    "10.0.12.0/23",
    "10.0.14.0/23"
  ]
  
  database_subnet_cidrs = [
    "10.0.20.0/23",
    "10.0.22.0/23",
    "10.0.24.0/23"
  ]

  enable_nat_gateway     = true
  single_nat_gateway     = false
  enable_vpn_gateway     = true
  enable_dns_hostnames   = true
  enable_dns_support     = true
  enable_flow_logs       = true
  flow_logs_retention_days = 90

  tags = {
    Environment = "production"
    Service     = "attribution-analytics"
  }
}

# EKS Module for production environment
module "eks" {
  source = "../../modules/eks"

  cluster_name    = "attribution-prod"
  cluster_version = "1.26"
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids

  node_groups = {
    general = {
      desired_size    = 3
      min_size        = 2
      max_size        = 6
      instance_types  = ["m5.xlarge"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
      labels = {
        role = "general"
      }
      taints = []
    }
    processing = {
      desired_size    = 3
      min_size        = 2
      max_size        = 8
      instance_types  = ["c5.2xlarge"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
      labels = {
        role = "processing"
      }
      taints = []
    }
    analytics = {
      desired_size    = 2
      min_size        = 1
      max_size        = 4
      instance_types  = ["r5.2xlarge"]
      capacity_type   = "ON_DEMAND"
      disk_size       = 100
      labels = {
        role = "analytics"
      }
      taints = []
    }
  }

  enable_private_endpoint     = true
  enable_encryption          = true
  cluster_log_types         = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
  enable_metrics_server     = true
  enable_cluster_autoscaler = true
  enable_container_insights = true

  tags = {
    Environment = "production"
    Service     = "attribution-analytics"
  }
}

# RDS Module for production environment
module "rds" {
  source = "../../modules/rds"

  identifier_prefix = "attribution-prod"
  engine_version    = "15.3"
  instance_class    = "db.r6g.xlarge"
  
  allocated_storage     = 100
  max_allocated_storage = 1000
  
  multi_az                = true
  backup_retention_period = var.backup_retention_days
  
  enable_performance_insights          = true
  performance_insights_retention_period = 7
  read_replica_count                   = 2
  
  vpc_id              = module.vpc.vpc_id
  subnet_ids          = module.vpc.database_subnet_ids
  security_group_ids  = [aws_security_group.rds.id]
  
  deletion_protection = true
  enable_encryption   = true
  enable_iam_authentication = true
  
  environment = "production"
}

# Security group for RDS instances
resource "aws_security_group" "rds" {
  name_prefix = "attribution-prod-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [module.eks.cluster_security_group_id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name        = "attribution-prod-rds-sg"
    Environment = "production"
  }
}

# CloudWatch Alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "rds_cpu" {
  alarm_name          = "attribution-prod-rds-cpu"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = "300"
  statistic           = "Average"
  threshold           = "80"
  alarm_description   = "RDS CPU utilization is too high"
  alarm_actions       = [aws_sns_topic.alerts.arn]

  dimensions = {
    DBInstanceIdentifier = module.rds.primary_resource_id
  }
}

# SNS Topic for alerts
resource "aws_sns_topic" "alerts" {
  name = "attribution-prod-alerts"
}

# Outputs
output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "eks_cluster_endpoint" {
  description = "EKS cluster endpoint"
  value       = module.eks.cluster_endpoint
  sensitive   = true
}

output "rds_endpoint" {
  description = "RDS primary endpoint"
  value       = module.rds.primary_endpoint
  sensitive   = true
}

output "rds_replica_endpoints" {
  description = "RDS replica endpoints"
  value       = module.rds.replica_endpoints
  sensitive   = true
}