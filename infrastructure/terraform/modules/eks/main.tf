# AWS Provider configuration for EKS resources
# Version ~> 5.0
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.0"
    }
  }
}

# KMS key for envelope encryption of Kubernetes secrets
resource "aws_kms_key" "eks" {
  count                   = var.enable_encryption ? 1 : 0
  description             = "KMS key for EKS cluster ${var.cluster_name} secret encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true
  
  tags = merge(var.tags, {
    Name = "${var.cluster_name}-eks-encryption-key"
  })
}

# IAM role for EKS cluster
resource "aws_iam_role" "cluster_role" {
  name = "${var.cluster_name}-cluster-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks.amazonaws.com"
      }
    }]
  })
  
  tags = var.tags
}

# Attach required policies to cluster role
resource "aws_iam_role_policy_attachment" "cluster_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
    "arn:aws:iam::aws:policy/AmazonEKSVPCResourceController"
  ])
  
  policy_arn = each.value
  role       = aws_iam_role.cluster_role.name
}

# Security group for EKS cluster
resource "aws_security_group" "cluster" {
  name        = "${var.cluster_name}-cluster-sg"
  description = "Security group for EKS cluster ${var.cluster_name}"
  vpc_id      = var.vpc_id
  
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
  
  tags = merge(var.tags, {
    Name = "${var.cluster_name}-cluster-sg"
  })
}

# EKS cluster resource
resource "aws_eks_cluster" "eks_cluster" {
  name     = var.cluster_name
  role_arn = aws_iam_role.cluster_role.arn
  version  = var.cluster_version
  
  vpc_config {
    subnet_ids              = var.subnet_ids
    endpoint_private_access = var.enable_private_endpoint
    endpoint_public_access  = !var.enable_private_endpoint
    security_group_ids      = [aws_security_group.cluster.id]
  }
  
  encryption_config {
    count = var.enable_encryption ? 1 : 0
    provider {
      key_arn = coalesce(var.kms_key_arn, try(aws_kms_key.eks[0].arn, ""))
    }
    resources = ["secrets"]
  }
  
  enabled_cluster_log_types = var.cluster_log_types
  
  tags = var.tags
  
  depends_on = [
    aws_iam_role_policy_attachment.cluster_policies
  ]
}

# IAM role for node groups
resource "aws_iam_role" "node_role" {
  name = "${var.cluster_name}-node-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
  })
  
  tags = var.tags
}

# Attach required policies to node role
resource "aws_iam_role_policy_attachment" "node_policies" {
  for_each = toset([
    "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy",
    "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy",
    "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly",
    "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  ])
  
  policy_arn = each.value
  role       = aws_iam_role.node_role.name
}

# EKS node groups
resource "aws_eks_node_group" "node_groups" {
  for_each = var.node_groups
  
  cluster_name    = aws_eks_cluster.eks_cluster.name
  node_group_name = "${var.cluster_name}-${each.key}"
  node_role_arn   = aws_iam_role.node_role.arn
  subnet_ids      = var.subnet_ids
  
  scaling_config {
    desired_size = each.value.desired_size
    max_size     = each.value.max_size
    min_size     = each.value.min_size
  }
  
  instance_types = each.value.instance_types
  capacity_type  = each.value.capacity_type
  disk_size      = each.value.disk_size
  
  labels = each.value.labels
  
  dynamic "taint" {
    for_each = each.value.taints
    content {
      key    = taint.value.key
      value  = taint.value.value
      effect = taint.value.effect
    }
  }
  
  tags = merge(var.tags, {
    Name = "${var.cluster_name}-${each.key}-node-group"
  })
  
  depends_on = [
    aws_iam_role_policy_attachment.node_policies
  ]
}

# EKS cluster addons
resource "aws_eks_addon" "cluster_addons" {
  for_each = var.cluster_addons
  
  cluster_name = aws_eks_cluster.eks_cluster.name
  addon_name   = each.key
  addon_version = each.value.version
  resolve_conflicts = each.value.resolve_conflicts
  
  tags = var.tags
  
  depends_on = [
    aws_eks_cluster.eks_cluster,
    aws_eks_node_group.node_groups
  ]
}

# Output the cluster endpoint and certificate authority
output "cluster_endpoint" {
  description = "EKS cluster endpoint for kubectl access"
  value       = aws_eks_cluster.eks_cluster.endpoint
}

output "cluster_ca_certificate" {
  description = "EKS cluster certificate authority data"
  value       = aws_eks_cluster.eks_cluster.certificate_authority[0].data
}

output "cluster_security_group_id" {
  description = "Security group ID attached to the EKS cluster"
  value       = aws_security_group.cluster.id
}

output "cluster_iam_role_arn" {
  description = "IAM role ARN of the EKS cluster"
  value       = aws_iam_role.cluster_role.arn
}

output "node_groups" {
  description = "Map of node groups created and their properties"
  value       = { for k, v in aws_eks_node_group.node_groups : k => {
    arn = v.arn
    id  = v.id
    status = v.status
  }}
}