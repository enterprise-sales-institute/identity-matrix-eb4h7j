# Configure Terraform settings and required providers
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

  backend "s3" {
    bucket         = "mta-analytics-terraform-state"
    key            = "infrastructure/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "mta-analytics-terraform-locks"
  }
}

# Local variables for resource naming and tagging
locals {
  name_prefix = "${var.project}-${var.environment}"
  common_tags = merge(var.tags, {
    Environment = var.environment
    ManagedBy   = "terraform"
  })
}

# VPC Module for networking infrastructure
module "vpc" {
  source = "./modules/vpc"

  vpc_name              = "${local.name_prefix}-vpc"
  vpc_cidr              = var.vpc_cidr
  azs                   = var.availability_zones
  public_subnet_cidrs   = [for i, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 8, i)]
  private_subnet_cidrs  = [for i, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 4, i + 10)]
  database_subnet_cidrs = [for i, az in var.availability_zones : cidrsubnet(var.vpc_cidr, 5, i + 20)]
  
  enable_nat_gateway  = true
  single_nat_gateway = var.environment != "prod"
  tags               = local.common_tags
}

# EKS Module for Kubernetes cluster
module "eks" {
  source = "./modules/eks"

  cluster_name    = "${local.name_prefix}-eks"
  cluster_version = var.eks_cluster_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  node_groups     = var.eks_node_groups

  enable_irsa = true
  
  cluster_encryption_config = [{
    provider_key_arn = aws_kms_key.eks.arn
    resources        = ["secrets"]
  }]

  tags = local.common_tags
}

# RDS Module for PostgreSQL database
module "rds" {
  source = "./modules/rds"

  identifier     = "${local.name_prefix}-postgresql"
  engine         = "aurora-postgresql"
  engine_version = "15.3"
  
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage
  
  vpc_id               = module.vpc.vpc_id
  subnet_ids           = module.vpc.database_subnet_ids
  multi_az             = var.multi_az_enabled
  deletion_protection  = var.enable_deletion_protection
  
  backup_retention_period      = var.backup_retention_period
  performance_insights_enabled = var.performance_insights_enabled
  monitoring_interval         = var.monitoring_interval
  
  storage_encrypted = var.enable_encryption
  kms_key_id       = aws_kms_key.rds.arn

  tags = local.common_tags
}

# ElastiCache Module for Redis cluster
module "elasticache" {
  source = "./modules/elasticache"

  cluster_id           = "${local.name_prefix}-redis"
  engine              = "redis"
  engine_version      = "7.0"
  node_type           = var.redis_node_type
  
  vpc_id      = module.vpc.vpc_id
  subnet_ids  = module.vpc.database_subnet_ids
  
  multi_az_enabled     = var.multi_az_enabled
  automatic_failover   = var.multi_az_enabled
  encryption_at_rest   = var.enable_encryption
  kms_key_id          = aws_kms_key.elasticache.arn
  
  cluster_mode_enabled = true
  replicas_per_node_group = var.environment == "prod" ? 2 : 1
  num_node_groups     = var.environment == "prod" ? 3 : 1

  tags = local.common_tags
}

# ClickHouse Module for analytics database
module "clickhouse" {
  source = "./modules/clickhouse"

  cluster_name     = "${local.name_prefix}-clickhouse"
  instance_type    = var.clickhouse_instance_type
  
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnet_ids
  
  node_count      = var.environment == "prod" ? 6 : 2
  volume_size     = var.environment == "prod" ? 1000 : 100
  
  backup_enabled  = true
  backup_bucket   = "${local.name_prefix}-clickhouse-backup"
  
  encryption_enabled = var.enable_encryption
  kms_key_id        = aws_kms_key.clickhouse.arn

  tags = local.common_tags
}

# KMS keys for encryption
resource "aws_kms_key" "eks" {
  description             = "KMS key for EKS cluster encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                   = local.common_tags
}

resource "aws_kms_key" "rds" {
  description             = "KMS key for RDS encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                   = local.common_tags
}

resource "aws_kms_key" "elasticache" {
  description             = "KMS key for ElastiCache encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                   = local.common_tags
}

resource "aws_kms_key" "clickhouse" {
  description             = "KMS key for ClickHouse encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  tags                   = local.common_tags
}

# Outputs
output "vpc" {
  description = "VPC outputs"
  value = {
    vpc_id              = module.vpc.vpc_id
    private_subnet_ids  = module.vpc.private_subnet_ids
    database_subnet_ids = module.vpc.database_subnet_ids
    vpc_cidr_block     = module.vpc.vpc_cidr_block
  }
}

output "eks" {
  description = "EKS cluster outputs"
  value = {
    cluster_endpoint                  = module.eks.cluster_endpoint
    cluster_name                     = module.eks.cluster_name
    cluster_security_group_id        = module.eks.cluster_security_group_id
    cluster_certificate_authority_data = module.eks.cluster_certificate_authority_data
  }
}

output "rds" {
  description = "RDS instance outputs"
  sensitive   = true
  value = {
    endpoint        = module.rds.endpoint
    database_name   = module.rds.database_name
    port           = module.rds.port
    master_username = module.rds.master_username
  }
}

output "elasticache" {
  description = "ElastiCache cluster outputs"
  value = {
    endpoint               = module.elasticache.endpoint
    port                  = module.elasticache.port
    configuration_endpoint = module.elasticache.configuration_endpoint
  }
}

output "clickhouse" {
  description = "ClickHouse cluster outputs"
  value = {
    endpoint      = module.clickhouse.endpoint
    cluster_name  = module.clickhouse.cluster_name
    http_port     = module.clickhouse.http_port
    tcp_port      = module.clickhouse.tcp_port
  }
}