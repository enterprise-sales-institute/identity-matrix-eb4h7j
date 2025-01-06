# Provider configuration
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

# Security group for ClickHouse cluster
resource "aws_security_group" "clickhouse" {
  name_prefix = "clickhouse-${var.environment}-"
  description = "Security group for ClickHouse cluster"
  vpc_id      = var.vpc_id

  # Intra-cluster communication
  ingress {
    from_port = 9000
    to_port   = 9000
    protocol  = "tcp"
    self      = true
    description = "ClickHouse native protocol"
  }

  ingress {
    from_port = 9009
    to_port   = 9009
    protocol  = "tcp"
    self      = true
    description = "ClickHouse interserver communication"
  }

  ingress {
    from_port = 8123
    to_port   = 8123
    protocol  = "tcp"
    self      = true
    description = "ClickHouse HTTP protocol"
  }

  # Allow monitoring access
  ingress {
    from_port = 9363
    to_port   = 9363
    protocol  = "tcp"
    self      = true
    description = "ClickHouse monitoring"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
    description = "Allow all outbound traffic"
  }

  tags = merge(var.tags, {
    Name = "clickhouse-${var.environment}"
  })
}

# IAM role for ClickHouse instances
resource "aws_iam_role" "clickhouse" {
  name_prefix = "clickhouse-${var.environment}-"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = var.tags
}

# IAM instance profile
resource "aws_iam_instance_profile" "clickhouse" {
  name_prefix = "clickhouse-${var.environment}-"
  role        = aws_iam_role.clickhouse.name
}

# CloudWatch monitoring policy
resource "aws_iam_role_policy_attachment" "monitoring" {
  count      = var.enable_enhanced_monitoring ? 1 : 0
  role       = aws_iam_role.clickhouse.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonEC2RoleForSSM"
}

# Launch template for ClickHouse nodes
resource "aws_launch_template" "clickhouse" {
  name_prefix   = "clickhouse-${var.environment}-"
  image_id      = data.aws_ami.amazon_linux_2.id
  instance_type = var.instance_type

  network_interfaces {
    associate_public_ip_address = false
    security_groups            = [aws_security_group.clickhouse.id]
  }

  iam_instance_profile {
    name = aws_iam_instance_profile.clickhouse.name
  }

  block_device_mappings {
    device_name = "/dev/xvda"
    ebs {
      volume_size           = var.volume_size
      volume_type          = "gp3"
      iops                 = 16000
      throughput           = 1000
      encrypted            = var.enable_encryption
      kms_key_id          = var.kms_key_id != "" ? var.kms_key_id : null
      delete_on_termination = true
    }
  }

  user_data = base64encode(templatefile("${path.module}/templates/user_data.sh", {
    cluster_name          = var.cluster_name
    max_memory_usage      = var.max_memory_usage
    max_concurrent_queries = var.max_concurrent_queries
    max_insert_threads    = var.max_insert_threads
    retention_days        = var.retention_days
  }))

  monitoring {
    enabled = var.enable_enhanced_monitoring
  }

  tags = var.tags

  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"
    http_put_response_hop_limit = 1
  }
}

# Auto Scaling Group for ClickHouse cluster
resource "aws_autoscaling_group" "clickhouse" {
  name_prefix               = "clickhouse-${var.environment}-"
  min_size                 = var.min_size
  max_size                 = var.max_size
  desired_capacity         = var.desired_capacity
  vpc_zone_identifier      = var.subnet_ids
  health_check_type        = "EC2"
  health_check_grace_period = 300

  launch_template {
    id      = aws_launch_template.clickhouse.id
    version = "$Latest"
  }

  dynamic "tag" {
    for_each = merge(var.tags, {
      Name = "clickhouse-${var.environment}"
    })
    content {
      key                 = tag.key
      value               = tag.value
      propagate_at_launch = true
    }
  }

  instance_refresh {
    strategy = "Rolling"
    preferences {
      min_healthy_percentage = 75
    }
  }
}

# CloudWatch alarms
resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "clickhouse-${var.environment}-cpu-utilization"
  comparison_operator = "GreaterThanThreshold"
  evaluation_periods  = 2
  metric_name        = "CPUUtilization"
  namespace          = "AWS/EC2"
  period             = 300
  statistic          = "Average"
  threshold          = 80
  alarm_description  = "CPU utilization above 80%"
  alarm_actions      = [aws_autoscaling_policy.scale_up.arn]

  dimensions = {
    AutoScalingGroupName = aws_autoscaling_group.clickhouse.name
  }
}

# Auto Scaling policies
resource "aws_autoscaling_policy" "scale_up" {
  name                   = "clickhouse-${var.environment}-scale-up"
  scaling_adjustment     = 1
  adjustment_type        = "ChangeInCapacity"
  cooldown              = 300
  autoscaling_group_name = aws_autoscaling_group.clickhouse.name
}

resource "aws_autoscaling_policy" "scale_down" {
  name                   = "clickhouse-${var.environment}-scale-down"
  scaling_adjustment     = -1
  adjustment_type        = "ChangeInCapacity"
  cooldown              = 300
  autoscaling_group_name = aws_autoscaling_group.clickhouse.name
}

# Data source for Amazon Linux 2 AMI
data "aws_ami" "amazon_linux_2" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Backup S3 bucket
resource "aws_s3_bucket" "backups" {
  bucket_prefix = "clickhouse-${var.environment}-backups-"
  
  tags = var.tags
}

resource "aws_s3_bucket_lifecycle_configuration" "backups" {
  bucket = aws_s3_bucket.backups.id

  rule {
    id     = "backup-retention"
    status = "Enabled"

    expiration {
      days = var.backup_retention_days
    }
  }
}

# SSM maintenance window for backups
resource "aws_ssm_maintenance_window" "backup" {
  name     = "clickhouse-${var.environment}-backup"
  schedule = var.backup_schedule
  duration = "PT2H"
  cutoff   = "PT1H"
}