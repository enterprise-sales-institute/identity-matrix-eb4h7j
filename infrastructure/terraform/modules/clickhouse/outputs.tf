# Security group outputs
output "cluster_security_group_id" {
  value       = aws_security_group.clickhouse.id
  description = "ID of the security group attached to ClickHouse cluster nodes"
}

output "cluster_security_group_name" {
  value       = aws_security_group.clickhouse.name
  description = "Name of the security group attached to ClickHouse cluster nodes"
}

# Auto Scaling Group outputs
output "cluster_asg_id" {
  value       = aws_autoscaling_group.clickhouse.id
  description = "ID of the Auto Scaling Group managing ClickHouse cluster nodes"
}

output "cluster_asg_arn" {
  value       = aws_autoscaling_group.clickhouse.arn
  description = "ARN of the Auto Scaling Group managing ClickHouse cluster nodes"
}

output "cluster_asg_name" {
  value       = aws_autoscaling_group.clickhouse.name
  description = "Name of the Auto Scaling Group managing ClickHouse cluster nodes"
}

# Launch template outputs
output "launch_template_id" {
  value       = aws_launch_template.clickhouse.id
  description = "ID of the launch template used for ClickHouse cluster nodes"
}

output "launch_template_version" {
  value       = aws_launch_template.clickhouse.latest_version
  description = "Latest version number of the launch template used for ClickHouse cluster nodes"
}