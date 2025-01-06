# VPC ID output for resource associations
output "vpc_id" {
  description = "ID of the created VPC for resource associations and security group configurations"
  value       = aws_vpc.main.id
}

# VPC CIDR block output for network planning
output "vpc_cidr_block" {
  description = "CIDR block of the created VPC for network ACL and security group configurations"
  value       = aws_vpc.main.cidr_block
}

# Public subnet IDs output for load balancer and bastion host placement
output "public_subnet_ids" {
  description = "List of public subnet IDs for load balancer and bastion host placement in each AZ"
  value       = aws_subnet.public[*].id
}

# Private subnet IDs output for application workload placement
output "private_subnet_ids" {
  description = "List of private subnet IDs for application workload placement in each AZ"
  value       = aws_subnet.private[*].id
}

# Database subnet IDs output for data tier placement
output "database_subnet_ids" {
  description = "List of database subnet IDs for RDS, ClickHouse and ElastiCache placement in each AZ"
  value       = aws_subnet.database[*].id
}

# Public subnet CIDR blocks output for network configuration
output "public_subnet_cidrs" {
  description = "List of public subnet CIDR blocks for network planning and security group configurations"
  value       = aws_subnet.public[*].cidr_block
}

# Private subnet CIDR blocks output for network configuration
output "private_subnet_cidrs" {
  description = "List of private subnet CIDR blocks for network planning and security group configurations"
  value       = aws_subnet.private[*].cidr_block
}

# Database subnet CIDR blocks output for network configuration
output "database_subnet_cidrs" {
  description = "List of database subnet CIDR blocks for network planning and security group configurations"
  value       = aws_subnet.database[*].cidr_block
}