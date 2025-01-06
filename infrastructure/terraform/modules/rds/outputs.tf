# Primary RDS instance connection details
output "primary_endpoint" {
  description = "Connection endpoint for the primary RDS instance"
  value       = aws_db_instance.primary.endpoint
}

output "primary_address" {
  description = "Hostname of the primary RDS instance"
  value       = aws_db_instance.primary.address
}

output "primary_port" {
  description = "Port number for the RDS instance"
  value       = aws_db_instance.primary.port
}

output "primary_instance_id" {
  description = "Identifier of the primary RDS instance"
  value       = aws_db_instance.primary.id
}

# Read replica connection details
output "read_replica_endpoints" {
  description = "List of endpoints for read replica instances"
  value       = aws_db_instance.replicas[*].endpoint
}

output "read_replica_addresses" {
  description = "List of hostnames for read replica instances"
  value       = aws_db_instance.replicas[*].address
}

# Database configuration details
output "db_subnet_group_name" {
  description = "Name of the DB subnet group used by RDS instances"
  value       = aws_db_subnet_group.this.name
}

output "db_subnet_group_arn" {
  description = "ARN of the DB subnet group"
  value       = aws_db_subnet_group.this.arn
}

output "parameter_group_name" {
  description = "Name of the DB parameter group used by RDS instances"
  value       = aws_db_parameter_group.enhanced_monitoring.name
}

output "monitoring_role_arn" {
  description = "ARN of the IAM role used for enhanced monitoring"
  value       = aws_iam_role.rds_monitoring.arn
}

# Instance configuration
output "multi_az_enabled" {
  description = "Whether Multi-AZ deployment is enabled for the primary instance"
  value       = aws_db_instance.primary.multi_az
}

output "performance_insights_enabled" {
  description = "Whether Performance Insights is enabled for RDS instances"
  value       = aws_db_instance.primary.performance_insights_enabled
}

output "backup_retention_period" {
  description = "Number of days automated backups are retained"
  value       = aws_db_instance.primary.backup_retention_period
}

# Security and encryption
output "storage_encrypted" {
  description = "Whether the storage is encrypted"
  value       = aws_db_instance.primary.storage_encrypted
}

output "vpc_security_group_ids" {
  description = "List of VPC security group IDs attached to the RDS instances"
  value       = aws_db_instance.primary.vpc_security_group_ids
}