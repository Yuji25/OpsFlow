# OpsFlow — Temporary AWS VPC / EKS

OpsFlow's AWS demonstration was completed in **ap-south-1**: Terraform provisioned the VPC/EKS environment, a managed worker became Ready, and the application was deployed and validated with Helm. **After validation, the AWS infrastructure was destroyed with Terraform to prevent ongoing cloud charges. AWS is not currently running.**

[Grading evidence](../docs/EVIDENCE.md#m7--terraform--aws-infrastructure-as-code) records the saved plan, AWS Console, worker, application, and final cleanup captures. These are historical validation artifacts, not active endpoints. The final teardown screenshot records removal of the remaining two IAM roles through a saved destroy plan; it does not show the whole teardown in one command.

## Demonstrated Design

| Component | Configuration |
|---|---|
| Network | Dedicated `opsflow-vpc`, `10.20.0.0/16`; two public `/24` subnets in `ap-south-1a` and `ap-south-1b` |
| Internet access | Internet Gateway/public routes, DNS enabled, `MapPublicIpOnLaunch=true`; no NAT Gateway/private subnets |
| EKS | `opsflow-eks`, Kubernetes 1.36, STANDARD support policy |
| API access | Private endpoint enabled; public endpoint restricted to required administrator IPv4 CIDR |
| Worker | One On-Demand t3.medium, `opsflow-eks-demo`, min/desired/max 1/1/1, AL2023 x86-64 |
| Worker disk | Encrypted 20 GiB gp3 root disk, deleted on termination |
| Cost controls | Standard CPU credits, disabled EC2 detailed monitoring; no customer KMS key or optional CloudWatch log group |
| Essential add-ons | VPC CNI before workers, CoreDNS, kube-proxy; AWS-compatible versions resolved with `most_recent=true` |
| Tags | `Project=OpsFlow`, `Environment=demo`, `ManagedBy=Terraform` |

Public workers supplied outbound AWS/GHCR access without NAT. No SSH key/remote-access configuration was added. One worker was suitable for a brief demonstration, not a highly available deployment. Standard CPU credits can throttle sustained load.

The [EKS application override](../helm/opsflow/values-eks-demo.yaml) used namespace `opsflow-aws`, two backend/two frontend replicas, node-local ephemeral PostgreSQL `emptyDir`, ClusterIP Services, and port-forwarding. It disabled Ingress/HPA and added no cloud load balancer or persistent application EBS volume. This differs deliberately from persistent Minikube storage. The Helm deployment and Terraform provisioning were separate operations; CI does not deploy to EKS.

## Versions and State

[versions.tf](versions.tf) requires Terraform `>=1.7,<2.0` and AWS provider 5.100.0. [main.tf](main.tf) pins VPC module 5.8.1 and EKS module 20.37.1. [.terraform.lock.hcl](.terraform.lock.hcl) records provider checksums; downloading the EKS module's transitive KMS code does not enable a KMS resource.

Local state was used for this single-owner demonstration. [Ignore rules](.gitignore) exclude modules, state/backups, real tfvars, saved plans/JSON, crash logs, and generated kubeconfig. Keep state privately recoverable while resources exist; never commit it. The provider lockfile and [terraform.tfvars.example](terraform.tfvars.example) are intentionally versionable. No remote-state S3/DynamoDB infrastructure is configured.

[Outputs](outputs.tf) provide region, VPC ID, public subnet IDs, cluster name/endpoint, node-group name, and a command for an ignored local kubeconfig. The completed demonstration used a separately ignored repository-root kubeconfig. Explicit kubeconfig selection preserves the Minikube context; never publish kubeconfig contents.

## Reproduction: Preflight and Plan

**This guide does not authorize new AWS provisioning.** Recreating the demonstration incurs charges and requires explicit approval of the account, resource plan, costs, and retention window. No credentials belong in Terraform or tfvars; use an approved AWS CLI profile/credential mechanism outside Git.

Check identity privately, intended region, EKS/version/add-on availability, service quotas, and cluster/IAM naming collisions. Required lifecycle permissions include the relevant EKS, EC2/networking, IAM/PassRole and service-role operations, including cleanup. Have the account administrator resolve specific denied actions rather than automatically attaching broad permissions. A cluster-creator Kubernetes access entry does not grant missing AWS IAM permissions.

From `terraform/`:

```bash
cp terraform.tfvars.example terraform.tfvars
# Replace admin_cidr with the intended administrator public IPv4 /32.
terraform fmt -check
terraform init -input=false
terraform validate
terraform plan -input=false -no-color -detailed-exitcode -out=opsflow.tfplan
```

The example CIDR is a documentation address, not a usable administrator allowlist. Real inputs and saved plans are ignored; plans can contain sensitive metadata. Exit 2 means a successful plan with changes, 0 means no changes, and 1 means an error. Review the saved plan locally and regenerate it after changing inputs, permissions, or the administrator IP.

Verify two public subnets, one managed node group, OpsFlow tags, restricted public API access, and the absence of NAT/private subnets/load balancers/customer KMS/log-group resources. The module can defer add-on version reads until after cluster creation, so a successful plan alone does not prove those permissions or compatibility:

```bash
aws eks describe-cluster-versions --cluster-versions 1.36 --region ap-south-1
aws eks list-clusters --region ap-south-1
for addon in vpc-cni coredns kube-proxy; do
  aws eks describe-addon-versions --kubernetes-version 1.36 --addon-name "$addon" \
    --region ap-south-1 --query 'addons[].addonVersions[].addonVersion'
done
```

These commands are reproduction checks; version availability and permissions must be verified for the account at the time of reuse. Do not run a saved apply until its reviewed resources and billable retention window are separately approved.

## Validation After Authorized Provisioning

Verify both subnets/AZs, internet routes/public-IP assignment, EKS and managed node group ACTIVE, and the worker Ready. Use the output kubeconfig command with an explicitly selected ignored file; do not replace Minikube's configuration. From the repository root, if a root `./kubeconfig` has intentionally been generated for the new cluster:

```bash
KUBECONFIG=./kubeconfig helm upgrade --install opsflow ./helm/opsflow \
  --namespace opsflow-aws --create-namespace \
  --values helm/opsflow/values-eks-demo.yaml \
  --wait --wait-for-jobs --timeout 10m
KUBECONFIG=./kubeconfig kubectl -n opsflow-aws get pods,svc,jobs,pvc,ingress,hpa
```

After separate application deployment approval, the expected workload is five long-running pods and a successful migration Job, three ClusterIP Services, and no demo PVC/Ingress/HPA. Forward backend `18000:8000` and frontend `13000:80` through their Services for health/readiness and incident validation. PostgreSQL pod replacement loses the ephemeral data; rerun Helm upgrade to execute a new migration Job before continuing. No active AWS deployment is available from the completed demonstration.

## Costs and Cleanup

Review current [EKS](https://aws.amazon.com/eks/pricing/), [EC2](https://aws.amazon.com/ec2/pricing/on-demand/), [VPC/public IPv4](https://aws.amazon.com/vpc/pricing/), and [EBS](https://aws.amazon.com/ebs/pricing/) prices before any recreation. Cost drivers are the EKS control plane, worker, root disk, public IPv4, and applicable transfer/taxes. No exact bill or credit eligibility is established by repository evidence. EKS billing continues even if a worker is stopped; node updates can temporarily add capacity.

The completed AWS environment was retained only for validation and then removed. For any newly approved reproduction, obtain cleanup approval, remove the Helm demo and its namespace first, then review/apply Terraform's destroy plan. An explicitly reviewed saved destroy plan is applied with Terraform; its terminal summary can therefore say `Apply complete` while resources are being destroyed, as the captured final cleanup does.

Do not delete state before cleanup is verified. Check independently created disks, snapshots, load balancers, interfaces, and retained resources separately; those are not guaranteed to be removed by this configuration. Preserve unrelated/default VPCs, other projects, local Docker volumes, and Minikube. Billing can post later, so a successful destroy is not an account-wide billing guarantee.
