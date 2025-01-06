# Backend configuration for Terraform state management
# Version: AWS Provider >= 4.67.0
# This configuration implements secure state storage with encryption, 
# versioning, and state locking capabilities

terraform {
  backend "s3" {
    # S3 bucket for state storage with environment and project-based organization
    bucket = "tf-state-${var.project}-${var.environment}"
    
    # State file path with workspace isolation
    key = "terraform.tfstate"
    
    # Primary region for state storage
    region = "us-east-1"
    
    # Enhanced security configurations
    encrypt        = true
    kms_key_id     = "arn:aws:kms:us-east-1:ACCOUNT_ID:key/KEY_ID"
    sse_algorithm  = "aws:kms"
    
    # DynamoDB table for state locking
    dynamodb_table = "tf-state-lock-${var.project}"
    
    # Workspace management for environment isolation
    workspace_key_prefix = "env"
    
    # Additional security configurations
    force_path_style = false
    
    # Version validation to ensure compatibility
    min_version = "1.5.0"
    
    # Access logging and monitoring
    acl                  = "private"
    versioning          = true
    
    # Cross-region replication for disaster recovery
    replica_regions = {
      "us-west-2" = {
        kms_key_id = "arn:aws:kms:us-west-2:ACCOUNT_ID:key/REPLICA_KEY_ID"
      }
    }
    
    # Enhanced backend configuration
    skip_credentials_validation = false
    skip_region_validation     = false
    skip_metadata_api_check    = false
    
    # HTTP configurations for API communication
    http_proxy               = null
    https_proxy              = null
    no_proxy                = null
    max_retries             = 5
    shared_credentials_file = "~/.aws/credentials"
    profile                 = "default"
  }
  
  # Required provider versions
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 4.67.0"
    }
  }
  
  # Minimum Terraform version requirement
  required_version = ">= 1.5.0"
}

# Backend configuration validation
locals {
  backend_validation = {
    environment_valid = contains(["dev", "staging", "prod"], var.environment)
    project_valid     = length(var.project) > 0
  }
}