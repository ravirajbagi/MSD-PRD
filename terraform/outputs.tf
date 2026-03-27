output "alb_dns_name" {
  description = "DNS name of the Application Load Balancer — use this to access the app"
  value       = aws_lb.app.dns_name
}

output "ecr_repository_url" {
  description = "ECR repository URL for pushing Docker images"
  value       = aws_ecr_repository.app.repository_url
}
