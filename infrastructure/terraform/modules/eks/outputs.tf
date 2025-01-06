# Output definitions for the EKS module exposing essential cluster information

# Core cluster outputs
output "cluster_id" {
  description = "The ID of the EKS cluster"
  value       = aws_eks_cluster.eks_cluster.id
}

output "cluster_endpoint" {
  description = "The endpoint URL for the EKS cluster API server"
  value       = aws_eks_cluster.eks_cluster.endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64 encoded certificate authority data for cluster authentication"
  value       = aws_eks_cluster.eks_cluster.certificate_authority[0].data
  sensitive   = true
}

output "cluster_version" {
  description = "The Kubernetes version running on the EKS cluster"
  value       = aws_eks_cluster.eks_cluster.version
}

# Node group outputs
output "node_groups_ids" {
  description = "Map of node group names to their IDs"
  value       = {
    for k, v in aws_eks_node_group.node_groups : k => v.id
  }
}

output "node_groups_arns" {
  description = "Map of node group names to their ARNs"
  value       = {
    for k, v in aws_eks_node_group.node_groups : k => v.arn
  }
}

output "node_groups_scaling_config" {
  description = "Map of node group names to their scaling configuration"
  value       = {
    for k, v in aws_eks_node_group.node_groups : k => v.scaling_config[0]
  }
}

# Security outputs
output "cluster_security_group_id" {
  description = "ID of the security group attached to the EKS cluster"
  value       = aws_security_group.cluster.id
}

output "cluster_role_arn" {
  description = "ARN of the IAM role used by the EKS cluster"
  value       = aws_iam_role.cluster_role.arn
}

output "node_role_arn" {
  description = "ARN of the IAM role used by the EKS nodes"
  value       = aws_iam_role.node_role.arn
}

# Generated kubeconfig output
output "kubeconfig" {
  description = "Generated kubeconfig content for cluster access"
  value       = templatefile("${path.module}/templates/kubeconfig.tpl", {
    cluster_name                  = var.cluster_name
    cluster_endpoint             = aws_eks_cluster.eks_cluster.endpoint
    cluster_certificate_authority = aws_eks_cluster.eks_cluster.certificate_authority[0].data
    region                       = data.aws_region.current.name
  })
  sensitive = true
}

# Additional cluster information
output "cluster_addons" {
  description = "Map of installed EKS cluster addons and their versions"
  value       = {
    for k, v in aws_eks_addon.cluster_addons : k => {
      version = v.addon_version
      status  = v.status
    }
  }
}

output "cluster_encryption_config" {
  description = "Encryption configuration for the EKS cluster"
  value       = var.enable_encryption ? {
    provider_key_arn = coalesce(var.kms_key_arn, try(aws_kms_key.eks[0].arn, ""))
    resources        = ["secrets"]
  } : null
}

output "cluster_logging_enabled_types" {
  description = "List of enabled control plane logging types"
  value       = var.cluster_log_types
}

# VPC configuration
output "cluster_vpc_config" {
  description = "VPC configuration for the EKS cluster"
  value       = {
    vpc_id             = var.vpc_id
    subnet_ids         = var.subnet_ids
    security_group_ids = [aws_security_group.cluster.id]
  }
}

# Data source for current AWS region
data "aws_region" "current" {}