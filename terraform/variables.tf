variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "app_image" {
  description = "ECR image URI for the paper-to-notebook container (e.g. 123456789.dkr.ecr.us-east-1.amazonaws.com/paper-to-notebook:latest)"
  type        = string
  default     = "placeholder/paper-to-notebook:latest"
}
