# VPC Outputs with region awareness and network configuration
output "vpc_outputs" {
  description = "VPC configuration outputs for network integration"
  value = {
    vpc_id             = module.vpc.vpc_id
    private_subnet_ids = module.vpc.private_subnet_ids
    region            = module.vpc.region
    environment       = var.environment
  }
  
  # Sensitive network information should be marked as sensitive
  sensitive = true
}

# EKS Cluster Outputs with enhanced security metadata
output "eks_outputs" {
  description = "EKS cluster configuration outputs for service deployment"
  value = {
    cluster_endpoint           = module.eks.cluster_endpoint
    cluster_name              = module.eks.cluster_name
    cluster_security_group_id = module.eks.cluster_security_group_id
    cluster_version          = module.eks.cluster_version
    node_groups              = module.eks.node_groups
    cluster_iam_role_arn     = module.eks.cluster_iam_role_arn
  }
  
  # Sensitive cluster information should be marked as sensitive
  sensitive = true
}

# RDS Database Outputs with version tracking
output "rds_outputs" {
  description = "RDS database configuration outputs for application connectivity"
  value = {
    primary_endpoint     = module.rds.primary_endpoint
    database_name       = module.rds.database_name
    port               = module.rds.port
    engine_version     = module.rds.engine_version
    replica_endpoints  = module.rds.replica_endpoints
    monitoring_role_arn = module.rds.monitoring_role_arn
  }
  
  # Sensitive database information should be marked as sensitive
  sensitive = true
}

# Cross-Region Deployment Outputs
output "deployment_metadata" {
  description = "Cross-region deployment metadata for infrastructure management"
  value = {
    primary_region = data.aws_region.current.name
    deployment_id  = random_id.deployment_id.hex
    environment    = var.environment
    terraform_version = terraform.workspace
  }
}

# Security and Compliance Outputs
output "security_metadata" {
  description = "Security configuration and compliance metadata"
  value = {
    encryption_enabled    = var.enable_encryption
    backup_retention     = var.backup_retention_period
    monitoring_enabled   = var.enable_monitoring
    compliance_status    = local.compliance_status
    last_security_audit = timestamp()
  }
}

# Infrastructure Health Outputs
output "health_status" {
  description = "Infrastructure health and availability status"
  value = {
    vpc_status     = module.vpc.network_status
    eks_status     = module.eks.cluster_status
    rds_status     = module.rds.database_status
    multi_az       = var.multi_az_enabled
    high_availability = local.high_availability_status
  }
}

# Resource Tags Output
output "resource_tags" {
  description = "Common resource tags for infrastructure components"
  value = {
    environment = var.environment
    project     = "attribution-analytics"
    managed_by  = "terraform"
    created_at  = timestamp()
    owner       = var.infrastructure_owner
  }
}

# Monitoring and Logging Outputs
output "monitoring_config" {
  description = "Monitoring and logging configuration details"
  value = {
    cloudwatch_log_groups = module.monitoring.log_groups
    metrics_enabled      = var.enable_metrics
    log_retention       = var.log_retention_days
    alert_endpoints     = var.alert_endpoints
  }
  
  # Sensitive monitoring information should be marked as sensitive
  sensitive = true
}

# Cost Management Outputs
output "cost_allocation" {
  description = "Cost allocation and resource utilization metadata"
  value = {
    billing_tags    = local.billing_tags
    cost_center    = var.cost_center
    business_unit  = var.business_unit
    resource_count = local.total_resource_count
  }
}

# Disaster Recovery Outputs
output "dr_config" {
  description = "Disaster recovery and backup configuration"
  value = {
    backup_enabled        = var.enable_backups
    dr_region            = var.dr_region
    recovery_point_objective = var.rpo_hours
    recovery_time_objective = var.rto_hours
    backup_retention_period = var.backup_retention_period
  }
  
  # Sensitive DR information should be marked as sensitive
  sensitive = true
}

# Service Integration Outputs
output "integration_endpoints" {
  description = "Service integration endpoints and connection details"
  value = {
    api_endpoint         = module.api_gateway.endpoint
    service_mesh_endpoint = module.service_mesh.endpoint
    load_balancer_dns    = module.load_balancer.dns_name
    cdn_domain           = module.cdn.domain_name
  }
  
  # Sensitive endpoint information should be marked as sensitive
  sensitive = true
}