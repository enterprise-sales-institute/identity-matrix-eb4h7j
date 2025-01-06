# AWS Provider configuration with version constraint
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
}

# DB Subnet Group for RDS instances
resource "aws_db_subnet_group" "this" {
  name_prefix = "${var.identifier_prefix}-subnet-group"
  subnet_ids  = var.subnet_ids

  tags = {
    Name          = "${var.identifier_prefix}-subnet-group"
    Environment   = var.environment
    ManagedBy     = "terraform"
    SecurityLevel = "high"
  }
}

# Enhanced monitoring IAM role
resource "aws_iam_role" "rds_monitoring" {
  name_prefix = "${var.identifier_prefix}-monitoring"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "monitoring.rds.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name        = "${var.identifier_prefix}-monitoring-role"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Attach enhanced monitoring policy to the IAM role
resource "aws_iam_role_policy_attachment" "rds_monitoring" {
  role       = aws_iam_role.rds_monitoring.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonRDSEnhancedMonitoringRole"
}

# Parameter group for enhanced monitoring and performance
resource "aws_db_parameter_group" "enhanced_monitoring" {
  family = "postgres15"
  name_prefix = "${var.identifier_prefix}-params"

  parameter {
    name  = "shared_preload_libraries"
    value = "pg_stat_statements"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "ALL"
  }

  parameter {
    name  = "log_statement"
    value = "all"
  }

  tags = {
    Name        = "${var.identifier_prefix}-parameter-group"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# Primary RDS instance
resource "aws_db_instance" "primary" {
  identifier_prefix = var.identifier_prefix
  engine           = "postgres"
  engine_version   = var.engine_version
  instance_class   = var.instance_class
  
  # Storage configuration
  allocated_storage = var.allocated_storage
  storage_type      = "gp3"
  storage_encrypted = true
  
  # Network configuration
  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = var.security_group_ids
  multi_az              = var.multi_az
  
  # Backup and maintenance configuration
  backup_retention_period   = var.backup_retention_period
  backup_window            = "03:00-04:00"
  maintenance_window       = "Mon:04:00-Mon:05:00"
  deletion_protection      = true
  skip_final_snapshot      = false
  final_snapshot_identifier = "${var.identifier_prefix}-final-snapshot"
  copy_tags_to_snapshot    = true
  
  # Monitoring and performance configuration
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = 7
  enabled_cloudwatch_logs_exports       = ["postgresql", "upgrade"]
  
  # Version management
  auto_minor_version_upgrade = true
  parameter_group_name      = aws_db_parameter_group.enhanced_monitoring.name

  tags = {
    Name        = "${var.identifier_prefix}-primary"
    Environment = var.environment
    ManagedBy   = "terraform"
    Role        = "primary"
  }
}

# Read replicas
resource "aws_db_instance" "replicas" {
  count = var.read_replica_count

  identifier_prefix = "${var.identifier_prefix}-replica-${count.index + 1}"
  instance_class    = var.instance_class
  replicate_source_db = aws_db_instance.primary.id
  
  # Network configuration
  vpc_security_group_ids = var.security_group_ids
  
  # Monitoring and performance configuration
  monitoring_interval = 60
  monitoring_role_arn = aws_iam_role.rds_monitoring.arn
  performance_insights_enabled          = var.enable_performance_insights
  performance_insights_retention_period = 7
  
  # Maintenance configuration
  auto_minor_version_upgrade = true
  maintenance_window        = "Mon:04:00-Mon:05:00"
  copy_tags_to_snapshot     = true

  tags = {
    Name        = "${var.identifier_prefix}-replica-${count.index + 1}"
    Environment = var.environment
    ManagedBy   = "terraform"
    Role        = "replica"
  }
}

# Outputs for the RDS module
output "primary_endpoint" {
  description = "The endpoint of the primary RDS instance"
  value       = aws_db_instance.primary.endpoint
}

output "primary_address" {
  description = "The hostname of the primary RDS instance"
  value       = aws_db_instance.primary.address
}

output "primary_port" {
  description = "The port of the primary RDS instance"
  value       = aws_db_instance.primary.port
}

output "primary_resource_id" {
  description = "The resource ID of the primary RDS instance"
  value       = aws_db_instance.primary.resource_id
}

output "replica_endpoints" {
  description = "The endpoints of the read replica instances"
  value       = aws_db_instance.replicas[*].endpoint
}

output "replica_resource_ids" {
  description = "The resource IDs of the read replica instances"
  value       = aws_db_instance.replicas[*].resource_id
}

output "db_subnet_group_name" {
  description = "The name of the DB subnet group"
  value       = aws_db_subnet_group.this.name
}

output "db_subnet_group_arn" {
  description = "The ARN of the DB subnet group"
  value       = aws_db_subnet_group.this.arn
}