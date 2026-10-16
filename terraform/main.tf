locals {
  tags = {
    Project     = "OpsFlow"
    Environment = var.environment
    ManagedBy   = "Terraform"
  }
}

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "5.8.1"

  name = var.vpc_name
  cidr = var.vpc_cidr
  azs  = var.availability_zones

  public_subnets          = var.public_subnet_cidrs
  private_subnets         = []
  map_public_ip_on_launch = true
  enable_dns_support      = true
  enable_dns_hostnames    = true
  create_igw              = true
  enable_nat_gateway      = false
  enable_vpn_gateway      = false

  # Do not adopt default resources or add unrelated infrastructure.
  manage_default_vpc            = false
  manage_default_network_acl    = false
  manage_default_route_table    = false
  manage_default_security_group = false

  public_subnet_tags = {
    "kubernetes.io/role/elb"                    = "1"
    "kubernetes.io/cluster/${var.cluster_name}" = "shared"
  }

  tags = local.tags
}

module "eks" {
  source  = "terraform-aws-modules/eks/aws"
  version = "20.37.1"

  cluster_name    = var.cluster_name
  cluster_version = var.kubernetes_version
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.public_subnets

  cluster_endpoint_private_access          = true
  cluster_endpoint_public_access           = true
  cluster_endpoint_public_access_cidrs     = [var.admin_cidr]
  enable_cluster_creator_admin_permissions = true

  cluster_upgrade_policy = {
    support_type = "STANDARD"
  }

  # Use EKS service encryption defaults; no customer-managed KMS key/log group.
  create_kms_key              = false
  cluster_encryption_config   = {}
  cluster_enabled_log_types   = []
  create_cloudwatch_log_group = false
  enable_irsa                 = false

  # Resolve compatible current versions from AWS, not hardcoded addon versions.
  # CNI is installed before workers so they can join and become Ready.
  cluster_addons = {
    vpc-cni = {
      before_compute = true
      most_recent    = true
    }
    coredns = {
      most_recent = true
    }
    kube-proxy = {
      most_recent = true
    }
  }

  eks_managed_node_groups = {
    demo = {
      name              = "${var.cluster_name}-demo"
      use_name_prefix   = false
      ami_type          = "AL2023_x86_64_STANDARD"
      capacity_type     = "ON_DEMAND"
      enable_monitoring = false
      instance_types    = [var.node_instance_type]
      min_size          = 1
      desired_size      = 1
      max_size          = 1

      # No remote_access block or SSH key. Public IP assignment comes from subnets.
      credit_specification = {
        cpu_credits = "standard"
      }
      block_device_mappings = {
        root = {
          device_name = "/dev/xvda"
          ebs = {
            volume_size           = 20
            volume_type           = "gp3"
            encrypted             = true
            delete_on_termination = true
          }
        }
      }
      tags = local.tags
    }
  }

  tags = local.tags
}
