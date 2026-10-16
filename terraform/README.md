# OpsFlow — temporary AWS VPC / EKS

This is Phase 7 infrastructure preparation for a short-lived classroom demonstration in **ap-south-1**. It maps to rubric M7: valid HCL, init, non-empty successful plan, two public subnets, EKS plus a managed worker group, a credential-free example tfvars, and eventual successful destroy evidence.

**Approval for implementation/validation is not approval to provision. Do not run apply until the code, successful saved plan, costs, account, and retention window have been separately reviewed and explicitly approved.** Nothing here automatically provisions, destroys, or changes IAM permissions.

## Design and versions

- Dedicated `opsflow-vpc`, `10.20.0.0/16`, two public `/24` subnets in `ap-south-1a` and `ap-south-1b`, Internet Gateway, public routes, DNS enabled, and `MapPublicIpOnLaunch=true`.
- No private subnets, NAT Gateway, Elastic IP allocation, paid VPC endpoints, load balancer, customer-managed KMS key, or CloudWatch log group. No existing/default VPC is adopted.
- `opsflow-eks`, Kubernetes **1.36**, standard-support policy, public **and** private API endpoints. Public API access requires `admin_cidr`, normally the administrator's current public IPv4 `/32`. Worker traffic uses the private endpoint. No unrestricted public API default or SSH configuration is provided.
- One managed node group, `opsflow-eks-demo`: **one On-Demand t3.medium**, min/desired/max **1/1/1**, **AL2023_x86_64_STANDARD**, encrypted **20 GiB gp3** root disk with delete-on-termination. Standard CPU credits avoid surplus-credit charges but can throttle sustained CPU load.
- Only essential managed add-ons: VPC CNI (before workers), CoreDNS, kube-proxy. The module queries AWS for the most recent compatible versions for the selected Kubernetes release; no add-on versions are hardcoded. For a new cluster, this module defers its add-on version reads until apply because they depend on the cluster resource. A successful plan alone therefore does not verify add-on versions or permission to query them; run the compatibility checks below before considering apply. No Auto Mode, Fargate, IRSA/OIDC provider, autoscaler, Helm deployment, monitoring, or EBS CSI installation is included.
- Terraform `>=1.7,<2.0`, AWS provider **5.100.0**, VPC module **5.8.1**, EKS module **20.37.1**. Retain `.terraform.lock.hcl` for exact provider versions/checksums. Modules are downloaded into ignored `.terraform/`, not vendored.
- Common tags: `Project=OpsFlow`, `Environment=demo`, `ManagedBy=Terraform`. Public subnet tags support later load-balancer discovery, without creating a load balancer now.

Public workers avoid NAT hourly/data-processing costs while allowing AWS APIs and public GHCR image pulls. Security groups do not open SSH or application ports to the internet. Private workers with NAT are preferable for many production environments but unnecessary for this brief lab. A t3.small has only 2 GiB and less headroom; one t3.medium is the minimum practical demonstration choice, not a highly available deployment.

## Account and permissions preflight

Use AWS CLI credentials or an approved profile outside the repository. Never place access keys in Terraform, tfvars, shell history, screenshots, or Git. Commands must explicitly use the intended region. Check STS locally, but redact account/principal identifiers in shared evidence.

The initial audit authenticated successfully but was denied `eks:DescribeClusterVersions`, `eks:ListClusters`, `iam:ListRoles`, `ssm:GetParameter`, `logs:DescribeLogGroups`, and `pricing:GetProducts`. EKS/IAM collision checks were therefore incomplete. No IAM policy was broadened. Have the account administrator authorize the required operations or supply an approved identity; AdministratorAccess is not the default solution.

Discovery/preflight requires regional EKS version/cluster checks, EC2 inventory/AZ reads, and appropriate IAM name checks. The add-on data sources require `eks:DescribeAddonVersions`, but their reads are deferred until apply for a new cluster. Explicitly verify this permission and compatible versions before approving any apply. STS identity reads and any other provider/module read calls must also succeed. SSM access is useful for independent AMI verification but is not required by this configuration's default node AMI selection. Pricing reads are optional for planning and do not provision resources; logging inspection is optional when checking old collisions.

Eventual provisioning and cleanup require additional, reviewed lifecycle permissions for EKS clusters/access entries/add-ons/node groups, EC2 networking/security groups/launch templates, IAM roles/policy attachments/PassRole, and relevant service-linked roles. EKS creates the worker Auto Scaling group, instance, interfaces, and disk through its service roles. The cluster-creator Kubernetes access entry does not grant the AWS principal missing IAM permissions. Preserve sufficient permissions for destroy. Resolve service quotas/collisions before apply; never fix an AccessDenied by automatically attaching broader policies.

## Pre-apply validation only

From `terraform/`, copy the example into ignored local inputs and replace the documentation CIDR with your actual administrator address:

```bash
cp terraform.tfvars.example terraform.tfvars
# Edit admin_cidr in terraform.tfvars; do not use the documentation address.
terraform fmt
terraform fmt -check
terraform init -input=false
terraform validate
terraform plan -input=false -detailed-exitcode -out=opsflow.tfplan
```

Plan exit codes: **0** means no changes, **2** means a successful plan with changes, **1** means an error. An error/partial plan is not provisioning approval or a successful rubric plan. Fix/report the exact denied API actions before rerunning. A saved plan can contain sensitive metadata: keep it private and ignored. Inspect locally with `terraform show opsflow.tfplan`; do not commit binary or JSON plan artifacts. Regenerate/review plans after inputs, permissions, or add-on availability change.

Review the successful plan for exactly two public subnets, one managed node group, OpsFlow names/tags, restricted public API CIDR, public-IP assignment, and zero NAT Gateways/private subnets/customer KMS keys/log groups/load balancers. AWS-managed backing resources and module bookkeeping are not necessarily separate Terraform resource addresses. Capture real, account-safe plan evidence only after the plan succeeds.

Because a new-cluster plan defers the module's add-on reads, check compatibility independently without creating anything:

```bash
aws eks describe-cluster-versions --cluster-versions 1.36 --region ap-south-1
aws eks list-clusters --region ap-south-1
for addon in vpc-cni coredns kube-proxy; do
  aws eks describe-addon-versions --kubernetes-version 1.36 --addon-name "$addon" \
    --region ap-south-1 --query 'addons[].addonVersions[].addonVersion'
done
```

Resolve denied reads and check OpsFlow IAM/cluster-name collisions before apply review. A successful Terraform plan is not evidence that the principal has creation, add-on discovery, or destroy permissions.

Local validation may supply the current administrator CIDR through `TF_VAR_admin_cidr` instead of creating tfvars. No credentials are required in these inputs. Configuration is parameterized; changing the region also requires selecting valid AZs. Do not reuse an old saved plan after changing the allowlist or network.

## State and outputs

Local state is intentionally sufficient for this one-user lab. `.terraform/`, `*.tfstate*`, real tfvars, plan binaries/JSON, crash logs, and generated `kubeconfig*` are ignored. **Do not delete local state while AWS resources exist.** Keep a private recovery copy outside Git. `.terraform.lock.hcl` is versionable and contains provider checksums rather than credentials. No S3/DynamoDB backend is created.

Outputs provide region, VPC ID, two public subnet IDs, cluster name/endpoint, managed node-group name, and a kubeconfig command. After separately approved provisioning, run the output command from `terraform/`; it uses an ignored local kubeconfig and the `opsflow-eks` alias. Use that explicit file for AWS checks so Minikube's context remains intact:

```bash
# Only after a separately approved apply has completed:
terraform output -raw update_kubeconfig_command
# Review and execute that displayed command, then:
kubectl --kubeconfig ./kubeconfig get nodes
aws eks describe-cluster --name opsflow-eks --region ap-south-1 --query 'cluster.status'
aws eks describe-nodegroup --cluster-name opsflow-eks --nodegroup-name opsflow-eks-demo \
  --region ap-south-1 --query 'nodegroup.status'
```

Verify both subnets and their AZs/routes/public-IP setting, EKS and node group ACTIVE, and the worker Ready. Record VPC/EKS Console evidence manually. Application deployment and EKS storage/Ingress/monitoring integration belong to the next phase; Minikube's hostpath storage configuration is not an AWS storage solution.

## Cost and temporary lifecycle

Standard-support EKS is currently **$0.10/hour**. Other drivers are the t3.medium worker, public IPv4 (**$0.005/hour per address**), gp3 root disk, and applicable transfer/taxes. Allow roughly **$0.15–0.18/hour**, or budget **$0.20/hour** before variable charges. The worker-price allowance is provisional: regional Pricing API access was denied during audit. Verify current regional prices and credit eligibility before apply; these are not billing guarantees. References: [EKS pricing](https://aws.amazon.com/eks/pricing/), [VPC pricing](https://aws.amazon.com/vpc/pricing/), [EC2 pricing](https://aws.amazon.com/ec2/pricing/on-demand/), [EBS pricing](https://aws.amazon.com/ebs/pricing/).

NAT would add hourly and per-GB costs and is deliberately absent. EKS continues billing even if the worker is stopped or scaled down. Later Kubernetes-created load balancers, data volumes, and additional nodes add costs. Managed node updates can temporarily create extra capacity. AWS credits do not make resources free indefinitely.

Before provisioning, obtain explicit approval for both the reviewed apply and the billable retention window. After infrastructure validation, retain EKS only for that approved window so the next phase can deploy OpsFlow. Do not automatically destroy immediately after provisioning, and do not leave it running indefinitely.

After the AWS application demonstration, obtain explicit cleanup approval. Remove next-phase Kubernetes-created load balancers and storage as appropriate before destroying their VPC/cluster dependencies. Then run and verify Terraform destroy, capturing the required completion evidence. The node's root disk is deleted on termination; the cluster, node group, Terraform-owned networking/security/IAM resources are removed. Independently created volumes, snapshots, load balancers, or other resources require separate checks. Billing can post later. Keep local state until removal is verified, and do not touch unrelated resources, Minikube, or Docker volumes.
