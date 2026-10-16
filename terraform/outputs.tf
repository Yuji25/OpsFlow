output "region" {
  description = "AWS region containing the demo resources."
  value       = var.aws_region
}

output "vpc_id" {
  description = "Dedicated OpsFlow VPC ID."
  value       = module.vpc.vpc_id
}

output "public_subnet_ids" {
  description = "Public subnets across the two selected AZs."
  value       = module.vpc.public_subnets
}

output "cluster_name" {
  description = "EKS cluster name."
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS API endpoint; public access is restricted to admin_cidr."
  value       = module.eks.cluster_endpoint
}

output "node_group_name" {
  description = "Managed node group name."
  value       = split(":", module.eks.eks_managed_node_groups["demo"].node_group_id)[1]
}

output "update_kubeconfig_command" {
  description = "Run from terraform/ after separately approved provisioning. Uses an ignored local file to preserve Minikube configuration."
  value       = "aws eks update-kubeconfig --region ${var.aws_region} --name ${module.eks.cluster_name} --alias opsflow-eks --kubeconfig ./kubeconfig"
}
