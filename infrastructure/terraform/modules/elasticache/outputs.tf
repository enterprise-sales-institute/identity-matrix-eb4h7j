# Cluster identification and management outputs
output "cluster_id" {
  value       = aws_elasticache_replication_group.redis.id
  description = "Identifier of the ElastiCache Redis replication group for resource management"
}

# Connection endpoint information with sensitive flag for security
output "cluster_endpoint" {
  value = {
    address = aws_elasticache_replication_group.redis.primary_endpoint_address
    port    = aws_elasticache_replication_group.redis.port
    reader_endpoint = aws_elasticache_replication_group.redis.reader_endpoint_address
  }
  description = "Redis cluster connection endpoints for primary and reader nodes"
  sensitive   = true
}

# Detailed cache node information for monitoring and operations
output "cache_nodes" {
  value = {
    number_cache_clusters = aws_elasticache_replication_group.redis.number_cache_clusters
    node_type            = aws_elasticache_replication_group.redis.node_type
    engine_version       = aws_elasticache_replication_group.redis.engine_version
  }
  description = "Details about the Redis cluster nodes including count, type and version"
  sensitive   = true
}

# Security-related outputs
output "security_group_id" {
  value       = aws_security_group.redis.id
  description = "ID of the security group controlling access to the Redis cluster"
}

# Network configuration details
output "subnet_group_details" {
  value = {
    name       = aws_elasticache_subnet_group.redis.name
    subnet_ids = aws_elasticache_subnet_group.redis.subnet_ids
  }
  description = "Network configuration details for the Redis cluster"
}

# Monitoring and operational information
output "monitoring_info" {
  value = {
    cluster_name         = var.cluster_name
    maintenance_window   = aws_elasticache_replication_group.redis.maintenance_window
    snapshot_window     = aws_elasticache_replication_group.redis.snapshot_window
    parameter_group     = aws_elasticache_parameter_group.redis.name
    multi_az_enabled    = aws_elasticache_replication_group.redis.multi_az_enabled
    encryption_at_rest  = aws_elasticache_replication_group.redis.at_rest_encryption_enabled
    encryption_in_transit = aws_elasticache_replication_group.redis.transit_encryption_enabled
    auto_failover      = aws_elasticache_replication_group.redis.automatic_failover_enabled
  }
  description = "Monitoring and operational configuration details for the Redis cluster"
}

# Performance configuration
output "performance_config" {
  value = {
    parameter_group_family = aws_elasticache_parameter_group.redis.family
    parameters = aws_elasticache_parameter_group.redis.parameter[*]
  }
  description = "Performance-related configuration parameters for the Redis cluster"
}

# Backup and recovery information
output "backup_info" {
  value = {
    snapshot_retention_limit = aws_elasticache_replication_group.redis.snapshot_retention_limit
    snapshot_window         = aws_elasticache_replication_group.redis.snapshot_window
  }
  description = "Backup configuration details for the Redis cluster"
}

# CloudWatch alarm configurations
output "monitoring_alarms" {
  value = {
    cpu_alarm_name    = aws_cloudwatch_metric_alarm.cache_cpu.alarm_name
    memory_alarm_name = aws_cloudwatch_metric_alarm.cache_memory.alarm_name
  }
  description = "Names of CloudWatch alarms monitoring the Redis cluster"
}