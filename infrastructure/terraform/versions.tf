# Terraform version constraint and required provider configurations for the 
# Multi-Touch Attribution Analytics Tool infrastructure

terraform {
  # Enforce minimum Terraform version 1.5.0 as specified in technical requirements
  required_version = ">= 1.5.0"

  # Define version constraints for required providers
  required_providers {
    # AWS provider for infrastructure management
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }

    # Kubernetes provider for EKS cluster management
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }

    # Helm provider for Kubernetes package management
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }

    # Random provider for generating unique identifiers
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}