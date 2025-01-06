# AWS ElastiCache Redis Cluster Configuration
# Provider version: ~> 4.0
# Terraform version: >= 1.0.0

terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 4.0"
    }
  }
  required_version = ">= 1.0.0"
}

locals {
  common_tags = {
    Environment = "production"
    Service     = "elasticache"
    ManagedBy   = "terraform"
  }
}

# Create ElastiCache subnet group for multi-AZ deployment
resource "aws_elasticache_subnet_group" "redis" {
  name        = "${var.cluster_name}-subnet-group"
  description = "Subnet group for ${var.cluster_name} Redis cluster"
  subnet_ids  = var.subnet_ids

  tags = merge(local.common_tags, var.tags)
}

# Security group for Redis cluster
resource "aws_security_group" "redis" {
  name_prefix = "${var.cluster_name}-redis-sg"
  description = "Security group for ${var.cluster_name} Redis cluster"
  vpc_id      = var.vpc_id

  ingress {
    description = "Redis port access"
    from_port   = var.port
    to_port     = var.port
    protocol    = "tcp"
    cidr_blocks = [data.aws_vpc.selected.cidr_block]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, var.tags)

  lifecycle {
    create_before_destroy = true
  }
}

# Redis parameter group for performance optimization
resource "aws_elasticache_parameter_group" "redis" {
  family      = var.parameter_group_family
  name        = "${var.cluster_name}-params"
  description = "Parameter group for ${var.cluster_name} Redis cluster"

  dynamic "parameter" {
    for_each = var.parameter_group_parameters
    content {
      name  = parameter.value.name
      value = parameter.value.value
    }
  }

  tags = merge(local.common_tags, var.tags)
}

# Redis replication group for high availability
resource "aws_elasticache_replication_group" "redis" {
  replication_group_id          = var.cluster_name
  replication_group_description = "${var.cluster_name} Redis cluster"
  node_type                    = var.node_type
  number_cache_clusters        = var.num_cache_nodes
  port                        = var.port
  parameter_group_name        = aws_elasticache_parameter_group.redis.name
  subnet_group_name           = aws_elasticache_subnet_group.redis.name
  security_group_ids          = [aws_security_group.redis.id]
  engine                      = "redis"
  engine_version              = var.engine_version
  
  automatic_failover_enabled  = true
  multi_az_enabled           = true
  auto_minor_version_upgrade = var.auto_minor_version_upgrade
  maintenance_window         = var.maintenance_window
  snapshot_window            = var.snapshot_window
  snapshot_retention_limit   = var.snapshot_retention_limit
  apply_immediately          = var.apply_immediately

  notification_topic_arn     = var.notification_topic_arn

  at_rest_encryption_enabled = true
  transit_encryption_enabled = true

  tags = merge(local.common_tags, var.tags)
}

# CloudWatch alarms for monitoring
resource "aws_cloudwatch_metric_alarm" "cache_cpu" {
  alarm_name          = "${var.cluster_name}-cpu-utilization"
  alarm_description   = "Redis cluster CPU utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "CPUUtilization"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "75"
  alarm_actions      = [var.notification_topic_arn]
  ok_actions         = [var.notification_topic_arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = merge(local.common_tags, var.tags)
}

resource "aws_cloudwatch_metric_alarm" "cache_memory" {
  alarm_name          = "${var.cluster_name}-memory-utilization"
  alarm_description   = "Redis cluster memory utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = "2"
  metric_name        = "DatabaseMemoryUsagePercentage"
  namespace          = "AWS/ElastiCache"
  period             = "300"
  statistic          = "Average"
  threshold          = "80"
  alarm_actions      = [var.notification_topic_arn]
  ok_actions         = [var.notification_topic_arn]

  dimensions = {
    CacheClusterId = aws_elasticache_replication_group.redis.id
  }

  tags = merge(local.common_tags, var.tags)
}

# Data source for VPC information
data "aws_vpc" "selected" {
  id = var.vpc_id
}