# OpsFlow — Grading Evidence

This index maps repository implementation and real captured screenshots to [GRADING.md](../GRADING.md). Screenshots record validation at the time of capture; they are not claims about current runtime availability. Minikube was the local Kubernetes/monitoring environment. The separate AWS infrastructure was provisioned, used for application validation, and destroyed afterward.

The documentation baseline is commit `35cb309`, with 11 capstone commits before this documentation change. The older local pytest capture is not linked here because it exposes workstation paths; the CI capture provides the passing test result without those local details. Screenshots have not been edited or fabricated for this index.

## M1 — Application — Frontend + Backend + Database

The application implements an incident domain with GET/POST/PUT/DELETE, React API calls, validation, health/readiness, and an Alembic-managed PostgreSQL table.

| Evidence | What it proves |
|---|---|
| [API and operational routes](../backend/app/main.py) | Incident CRUD, stats, health/readiness, metrics, and FastAPI docs. |
| [Model](../backend/app/models.py), [schemas](../backend/app/schemas.py), [database configuration](../backend/app/db.py) | Incident fields/timestamps, enums and validation, SQLAlchemy sessions. |
| [Initial incident migration](../backend/alembic/versions/0001_create_incidents.py), [Alembic environment](../backend/alembic/env.py), [requirements](../backend/requirements.txt) | PostgreSQL-compatible table definition and configured migration/dependency path. |
| [React dashboard](../frontend/src/main.jsx), [responsive styles](../frontend/src/styles.css), [Compose](../docker-compose.yml) | API integration, CRUD controls, responsive layouts, and the three-service application stack. |
| [Application dashboard](../screenshots/phase1-dashboard.png) | Populated incident table, KPI cards, severity/status badges, and recent activity. |
| [Incident form](../screenshots/phase1-incident-form.png) | Editing controls for incident details, service, assignee, severity, and status. |
| [KPI views](../screenshots/phase1-kpis.png) | Captured dashboard counts and incident status/severity presentation. |
| [Health/readiness](../screenshots/phase1-health-ready.png) | Successful operational endpoint responses. |
| [Metrics endpoint](../screenshots/phase1-metrics.png) | Prometheus-format application/process output. |
| [Swagger UI](../screenshots/phase1-swagger.png) | Exposed incident and operational API schema. |

The Critical KPI excludes resolved incidents. UI responsiveness is implemented in CSS; no dedicated mobile screenshot is stored. AWS application evidence is indexed under M8.

## M2 — Testing — Pytest + Code Quality

There are **36 API test cases, including parametrized cases**, exceeding the minimum five cases/three endpoints. The fixture creates a fresh in-memory SQLite engine per test, overrides database dependencies, runs startup against the test engine, and clears overrides afterward. `DATABASE_URL` and `APP_NAME` are set before application imports; PostgreSQL is not required by this suite.

| Evidence | What it proves |
|---|---|
| [API tests](../backend/tests/test_api.py) | CRUD/timestamps, operational endpoints, enum combinations, invalid create/update, missing required fields/resources, ordering, stats, and detail edits. |
| [pytest.ini](../backend/pytest.ini) | Project import-path configuration. |
| [CI pytest output](../screenshots/phase4-pytest.png) | **36 passed, 4 warnings** in the captured GitHub Actions run. |

The documentation audit independently reran the existing suite: **36 passed, 4 warnings**. Warnings concern deprecated TestClient/dependency and startup-event APIs; no warning suppression or dependency changes were made. SQLite tests do not prove PostgreSQL-specific migrations.

## M3 — Git and GitHub

| Evidence | What it proves |
|---|---|
| [Repository](https://github.com/Yuji25/OpsFlow) | Repository location for review. Submission-form entry is an owner action and is not proven by this repository. |
| [Commit history](../screenshots/final-commit-history.png) | Eleven capstone commits with meaningful application, testing, Docker, CI/security, Kubernetes, monitoring, AWS, and teardown messages. |
| [.gitignore](../.gitignore), [Terraform ignore rules](../terraform/.gitignore) | Environment, Python caches/venv, node_modules, state, real tfvars, plans, and kubeconfig exclusions; provider lockfile remains versionable. |

Local `git log --oneline` and `git rev-list --count HEAD` confirm **11 commits** through `35cb309`. The screenshot includes the initial failed CI gate and subsequent remediation/successful checks; it does not imply every historical run passed. The final commit-history PNG records the 11 capstone commits that existed before this documentation commit.

## M4 — Docker — Dockerfile + Compose

| Evidence | What it proves |
|---|---|
| [Backend Dockerfile](../backend/Dockerfile) | Python 3.12 Alpine runtime, pinned requirements, UID 10001, migrations before Uvicorn. |
| [Frontend Dockerfile](../frontend/Dockerfile), [Nginx configuration](../frontend/nginx.conf), [npm lockfile](../frontend/package-lock.json) | Node build stage, `npm ci`, production assets, unprivileged Nginx runtime on 8080, and API proxy to `backend:8000`. |
| [Compose](../docker-compose.yml) | PostgreSQL/backend/frontend services, health-gated dependencies, published ports, named database volume. |
| [Compose build/start output](../screenshots/phase3-compose-up.png) | Application image builds and successful startup of the isolated Docker validation stack. |
| [Compose status](../screenshots/phase3-compose-ps.png) | All three validation containers reported healthy. |
| [Docker-served dashboard](../screenshots/phase3-docker-dashboard.png) | Frontend served at localhost:3000 with a real incident. |
| [Containerized Swagger](../screenshots/phase3-docker-backend.png) | Backend docs reachable at localhost:8000/docs. |

The screenshots used temporary Compose project `opsflow-phase3-validation` and PostgreSQL port 55432; the normal file defaults to 5432. This does not change the documented `docker compose up --build` entry point. Database volume deletion is destructive.

## M5 — CI/CD — GitHub Actions Pipeline

| Evidence | What it proves |
|---|---|
| [CI workflow](../.github/workflows/ci.yml) | Push/PR/manual triggers; backend tests; frontend build; two image builds; blocking scans; guarded SHA-only publication with `GITHUB_TOKEN`. |
| [Recorded successful run](https://github.com/Yuji25/OpsFlow/actions/runs/38803999709) | Run URL visible in the captured CI test/scan pages. This is a recorded run, not a promise that every subsequent run is green. |
| [Actions overview](../screenshots/phase4-actions-overview.png) | Validation, build/scan, and publication jobs all succeeded. |
| [Backend GHCR package](../screenshots/phase4-ghcr-backend.png) | Published backend image package and commit-SHA version. |
| [Frontend GHCR package](../screenshots/phase4-ghcr-frontend.png) | Published frontend image package and commit-SHA version. |

The write-enabled publication job requires successful validation and both scans, the original repository, `refs/heads/main`, and a push/manual event. PRs do not log in or push. The exact scanned images are transferred as artifacts and loaded without rebuilding. No automated Kubernetes/EKS deployment exists. The test screenshot is indexed under M2; scan reports are under M6. No separate PR-run screenshot is stored.

## M6 — DevSecOps — Trivy Security Scan

| Evidence | What it proves |
|---|---|
| [Trivy workflow steps](../.github/workflows/ci.yml) | Both images scanned for OS/library vulnerabilities; HIGH/CRITICAL severity, `exit-code: 1`, `ignore-unfixed: false`; no `continue-on-error`. |
| [Backend Trivy report](../screenshots/phase4-trivy-backend.png) | Captured backend report shows no findings in the configured scope and a successful scan job. |
| [Frontend Trivy report](../screenshots/phase4-trivy-frontend.png) | Captured frontend report shows no findings in the configured scope; both blocking gate steps succeeded. |
| [Backend dependencies](../backend/requirements.txt), [backend image](../backend/Dockerfile), [frontend image](../frontend/Dockerfile) | Final dependency/base-image choices associated with the remediation history. |

Trivy scanned both application images for OS and library vulnerabilities. Publication was blocked on HIGH/CRITICAL findings, including unfixed findings, and the captured reports show no findings within that severity scope at scan time. A clean scoped result does not establish the absence of lower-severity, newly disclosed, or otherwise undetected vulnerabilities.

The history contains remediation commit `9917ad4`. No earlier CVE-detail screenshot is stored, so this index does not invent CVE identifiers, prior finding counts, or package-by-package remediation outcomes.

## M7 — Terraform — AWS Infrastructure as Code

Terraform provisioned a real OpsFlow VPC/EKS demonstration in ap-south-1. **After validation, the AWS infrastructure was destroyed with Terraform to prevent ongoing cloud charges. AWS is not currently running.**

| Evidence | What it proves |
|---|---|
| [Terraform resources](../terraform/main.tf), [provider](../terraform/providers.tf), [versions](../terraform/versions.tf) | Dedicated VPC, two public subnets/AZs, public-IP assignment/Internet Gateway, no NAT/private subnets, EKS and one managed worker group. |
| [Variables](../terraform/variables.tf), [example tfvars](../terraform/terraform.tfvars.example), [outputs](../terraform/outputs.tf) | Region/naming, required restricted administrator CIDR, credential-free example, and review/next-deployment outputs. |
| [Provider lockfile](../terraform/.terraform.lock.hcl), [ignore rules](../terraform/.gitignore), [lifecycle guide](../terraform/README.md) | Reproducible provider selection, private local state/input handling, preflight and cleanup procedures. |
| [Saved Terraform plan](../screenshots/phase7-terraform-plan.png) | A real non-empty saved plan: **13 to add, 0 to change, 0 to destroy** at that point, plus OpsFlow worker/volume tags. It is not evidence of an initial total resource count. |
| [AWS VPC Console](../screenshots/phase7-aws-vpc.png) | Dedicated `opsflow-vpc` Available alongside the unrelated default VPC. The screenshot does not enumerate its subnets. |
| [AWS EKS Console](../screenshots/phase7-aws-eks.png) | `opsflow-eks` Active on Kubernetes 1.36 during the demonstration. |
| [Cluster/node-group/worker checks](../screenshots/phase7-node-ready.png) | Cluster and node group ACTIVE, desired worker count 1, type t3.medium, and Kubernetes node Ready. |
| [Final Terraform teardown](../screenshots/phase7-terraform-destroy.png) | Applying the saved destroy plan successfully removed the final two IAM roles: 0 added, 0 changed, 2 destroyed. |

The configuration uses one On-Demand AL2023 x86-64 worker, min/desired/max 1/1/1, a 20 GiB encrypted gp3 root disk, standard CPU credits, disabled detailed monitoring, and essential CNI/CoreDNS/kube-proxy add-ons. Customer-managed KMS and optional CloudWatch log-group resources are disabled. Core add-on versions are resolved through AWS compatibility queries rather than hardcoded.

Evidence limits: no dedicated init/validate screenshot, subnet inventory screenshot, or account-wide post-cleanup screenshot is stored. The captured plan and active cluster/worker demonstrate successful provisioning; the two-subnet topology is defined by the Terraform configuration. The teardown screenshot records the final cleanup stage, not the entire teardown as one terminal result. No claim is made about unrelated resources elsewhere in the AWS account.

The real application deployment on this cluster is documented under M8. Its PostgreSQL volume was ephemeral; it did not add persistent EBS application storage or a cloud load balancer.

## M8 — Kubernetes + Helm

Minikube supplied the persistent local deployment and Ingress/HPA validation. The same chart also supported a separate, completed EKS demonstration. These environments are not interchangeable.

| Evidence | What it proves |
|---|---|
| [Namespace](../k8s/namespace.yaml), [chart metadata](../helm/opsflow/Chart.yaml), [default values](../helm/opsflow/values.yaml), [templates](../helm/opsflow/templates/) | OpsFlow namespace/bootstrap and complete chart structure. |
| [Minikube values](../helm/opsflow/values-minikube.yaml), [Ingress](../helm/opsflow/templates/ingress.yaml), [HPA](../helm/opsflow/templates/hpa.yaml) | Local hostname/routes and CPU autoscaling configuration. |
| [Backend Deployment](../helm/opsflow/templates/backend-deployment.yaml), [frontend Deployment](../helm/opsflow/templates/frontend-deployment.yaml) | Probes, CPU/memory resources, non-root users, frontend replicas, and backend migration-head wait. |
| [Backend Service](../helm/opsflow/templates/backend-service.yaml), [frontend Service](../helm/opsflow/templates/frontend-service.yaml) | ClusterIP backend 8000 and frontend 80 → 8080; `backend` DNS matches published Nginx configuration. |
| [PostgreSQL template](../helm/opsflow/templates/postgres.yaml), [migration Job](../helm/opsflow/templates/migration-job.yaml) | Default retained PVC/Recreate strategy, optional emptyDir, and one Alembic Job per Helm revision. |
| [Minikube pods](../screenshots/phase5-pods.png) | Two backend, two frontend, one PostgreSQL pod Running/Ready. |
| [Minikube Services/Ingress/PVC](../screenshots/phase5-services-ingress-pvc.png) | Three ClusterIP Services, `opsflow.local` Ingress, Bound 2 GiB PVC. |
| [Helm release](../screenshots/phase5-helm-list.png) | Deployed OpsFlow release in namespace `opsflow`. |
| [Helm history](../screenshots/phase5-helm-history.png) | Successful installation and non-destructive upgrade. |
| [HPA](../screenshots/phase5-hpa.png) | Numeric CPU target reading with minimum 2 / maximum 4 backend replicas. |
| [Pod metrics](../screenshots/phase5-top-pods.png) | Real CPU/memory readings for local application pods. |
| [Ingress dashboard](../screenshots/phase5-dashboard.png) | Application reached at `opsflow.local`. |
| [Ingress incident](../screenshots/phase5-incident-crud.png) | Populated incident dashboard through Ingress. |
| [Ingress health/readiness](../screenshots/phase5-health-ready.png) | Operational routes accessible through the local Ingress. |
| [Ingress metrics](../screenshots/phase5-metrics.png) | Metrics endpoint reachable through the local hostname. |
| [Ingress Swagger](../screenshots/phase5-swagger.png) | API documentation reachable through Ingress. |
| [EKS demo values](../helm/opsflow/values-eks-demo.yaml) | SHA-pinned images, two replicas per application, emptyDir PostgreSQL, disabled Ingress/HPA. |
| [EKS pods](../screenshots/phase8-eks-pods.png) | Five application/database pods Running/Ready on the AWS worker. |
| [EKS Helm release](../screenshots/phase8-helm-release.png) | OpsFlow release deployed in `opsflow-aws` during validation. |
| [EKS Services/exclusions](../screenshots/phase8-services.png) | Exactly three ClusterIP Services; no PVC, Ingress, or HPA in the demo namespace. |
| [EKS API validation](../screenshots/phase8-crud.png) | `/health`, `/ready`, and GET of the real incident, ID 1. This capture does not show the original POST response or a complete create/update/delete transcript. |
| [EKS dashboard](../screenshots/phase8-dashboard.png) | The incident `AWS EKS Phase 8 Demo` visible through frontend port-forward at localhost:13000. |

Migration Job completion is enforced by the documented `--wait --wait-for-jobs` install path; no separate migration-log screenshot is stored. Completed Jobs expire, so workload screenshots need not retain the migration pod. EKS used port-forwarding, not an Ingress or LoadBalancer; the Ingress requirement is demonstrated on Minikube. The AWS release and infrastructure have been removed.

## M9 — Observability — Prometheus + Grafana

Monitoring was deployed on Minikube in `opsflow-monitoring`, with standalone Prometheus and Grafana rather than an Operator/ServiceMonitor stack.

| Evidence | What it proves |
|---|---|
| [Instrumentation](../backend/app/main.py), [dependency](../backend/requirements.txt) | Backend `/metrics` integration. |
| [Prometheus values](../monitoring/prometheus-values.yaml) | 15-second pod discovery/scraping across namespaces, per-replica labels, modest resources, six-hour retention, persistent storage, disabled unrelated jobs/exporters. |
| [Grafana values](../monitoring/grafana-values.yaml), [dashboard JSON](../monitoring/opsflow-dashboard.json) | Provisioned datasource/dashboard, actual PromQL, generated admin Secret, disabled anonymous access, ephemeral Grafana storage. |
| [Backend metrics](../screenshots/phase6-backend-metrics.png) | Real Prometheus-format backend output. |
| [Prometheus Targets](../screenshots/phase6-prometheus-targets.png) | Two independently labelled backend targets UP, plus self-scraping. |
| [Prometheus query](../screenshots/phase6-prometheus-query.png) | Application request-counter series with actual handler/method/status/replica labels. |
| [Grafana datasource query](../screenshots/phase6-grafana-datasource.png) | Grafana Explore successfully querying both backend `up` series; not a separate Save & Test health-dialog capture. |
| [Grafana dashboard](../screenshots/phase6-grafana-dashboard.png) | Two targets UP and populated request/status history. The idle interval shows zero request rate and latency gaps. |
| [Monitoring pods/PVC/releases](../screenshots/phase6-monitoring-status.png) | Monitoring workloads Running, Prometheus PVC Bound, pinned chart releases deployed. |

Pinned charts: `prometheus-community/prometheus` 29.36.1 and `grafana-community/grafana` 13.5.0. The seven panels use `http_requests_total`, `http_request_duration_seconds_sum/count`, `process_cpu_seconds_total`, `process_resident_memory_bytes`, and Prometheus-generated `up`. Status labels are classes; CPU/memory panels describe Python processes, not total pod resources. No request-latency percentile, incident-count exporter, or cluster-wide resource dashboard is claimed.

## M10 — Final Presentation + Documentation

| Evidence | What it proves |
|---|---|
| [README](../README.md) | Final project description, architecture, application/API, delivery workflow, reproduction entry points, and completed AWS teardown. |
| [This evidence index](EVIDENCE.md), [original rubric](../GRADING.md) | Traceable M1–M10 artifact/evidence mapping and explicit limits. |
| [Terraform lifecycle guide](../terraform/README.md) | Detailed reproduction, approval, state, and cleanup boundaries without implying an active AWS environment. |

Final presentation materials and the recorded walkthrough are available in [`demo/`](../demo/).

## Reproducing Local Validation

These are reproduction instructions, not commands executed as part of this documentation audit. Preserve any existing data and choose unused local ports. AWS is destroyed; cloud recreation requires a separate authorized workflow described in the [Terraform guide](../terraform/README.md).

### Application development and migrations

Use Python 3.12 and a reachable PostgreSQL database. The backend's default development URL uses the disposable Compose database credentials; use appropriate environment configuration for any other database.

```bash
cd backend
python3.12 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
# Set DATABASE_URL for the intended database if it differs from development defaults.
.venv/bin/alembic upgrade head
.venv/bin/uvicorn app.main:app --reload --port 8000
```

In another terminal, run `npm ci` and `npm run dev` from `frontend/`; Vite serves port 5173 and proxies `/api` to 8000. `npm run build` creates the production frontend bundle.

The legacy starter migration revision is not part of OpsFlow's migration history. Do not reuse a database stamped with that history: provision a separate database and preserve old data. Changing initialization credentials does not rename roles/databases inside an initialized PostgreSQL volume. Downgrading the initial incident migration deletes its table.

### Minikube and monitoring

From the repository root, start the intended Minikube profile and enable its existing ingress/metrics-server addons if needed:

```bash
minikube -p minikube start
minikube -p minikube addons enable ingress
minikube -p minikube addons enable metrics-server
kubectl --context minikube apply -f k8s/namespace.yaml
helm lint helm/opsflow -f helm/opsflow/values-minikube.yaml
helm upgrade --install opsflow helm/opsflow --kube-context minikube -n opsflow \
  -f helm/opsflow/values-minikube.yaml --wait --wait-for-jobs --timeout 10m
kubectl --context minikube get pods,svc,ingress,pvc,hpa -n opsflow
```

Map the IP returned by `minikube -p minikube ip` to `opsflow.local` for browser access. On a host with a reachable Minikube IP, `curl --resolve` can test without changing hosts configuration:

```bash
curl --noproxy '*' --resolve "opsflow.local:80:$(minikube -p minikube ip)" http://opsflow.local/ready
```

If the IP is unreachable, use an ingress-controller port-forward and map the hostname to localhost for that access path. Keep one OpsFlow release per namespace: the frontend image expects backend DNS `backend:8000`. Retained PVCs are not deleted by application uninstall; namespace/PVC deletion can still destroy their data.

For local monitoring, check host capacity first and keep the pinned chart versions:

```bash
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana-community https://grafana-community.github.io/helm-charts
helm repo update
kubectl --context minikube create namespace opsflow-monitoring --dry-run=client -o yaml | kubectl --context minikube apply -f -
kubectl --context minikube -n opsflow-monitoring create configmap opsflow-dashboard \
  --from-file=opsflow-dashboard.json=monitoring/opsflow-dashboard.json \
  --dry-run=client -o yaml | kubectl --context minikube apply -f -
helm upgrade --install opsflow-prometheus prometheus-community/prometheus \
  --version 29.36.1 --kube-context minikube -n opsflow-monitoring \
  -f monitoring/prometheus-values.yaml --wait --timeout 10m
helm upgrade --install opsflow-grafana grafana-community/grafana \
  --version 13.5.0 --kube-context minikube -n opsflow-monitoring \
  -f monitoring/grafana-values.yaml --wait --timeout 10m
kubectl --context minikube auth can-i list pods -n opsflow --as=system:serviceaccount:opsflow-monitoring:opsflow-prometheus
kubectl --context minikube auth can-i watch pods -n opsflow --as=system:serviceaccount:opsflow-monitoring:opsflow-prometheus
```

Use separate terminals for localhost access:

```bash
kubectl --context minikube -n opsflow-monitoring port-forward svc/opsflow-prometheus 9090:80
kubectl --context minikube -n opsflow-monitoring port-forward svc/opsflow-grafana 3001:80
```

Grafana's username is `admin`; retrieve its generated password locally without placing it in Git, screenshots, or shared logs:

```bash
kubectl --context minikube -n opsflow-monitoring get secret opsflow-grafana -o jsonpath='{.data.admin-password}' | base64 --decode
```

Open localhost:9090 for Prometheus and localhost:3001 for Grafana. The dashboard requires no manual import. Reapply its ConfigMap after JSON changes, allow provisioning/scrape intervals, and refresh after real API traffic. Port-forwards may need reconnecting after pod replacement. Grafana restores provisioned files but not UI-only state; Prometheus retains samples on its PVC. Automatic browser refresh is not independently proven by the stored screenshots.

The retained [load-test helper](../scripts/load-test.sh) points to a TaskBoard route by default. If used intentionally for local traffic, supply an explicit OpsFlow `URL`; its failure-tolerant loop is not a correctness test. The [troubleshooting manifests](../troubleshooting/) are intentionally broken starter exercises and must not be applied as the working deployment.

## Final Rubric Checklist

Checked items are supported by repository implementation and captured evidence. Submission-form and presentation activities happen outside repository evidence and are listed separately below; this is not a self-awarded score.

### M1 — Application

- [x] FastAPI health endpoint and GET/POST/PUT/DELETE incident routes.
- [x] PostgreSQL incident table managed through Alembic.
- [x] React API integration and usable responsive interface.
- [x] Application, dependency, migration, Compose files and browser evidence present.

### M2 — Testing

- [x] Passing pytest evidence: 36 cases across more than three endpoints.
- [x] Test database isolation and configured pytest import path.

### M3 — Git and GitHub

- [x] Repository URL documented and 11 meaningful commits verified.
- [x] Commit-history screenshot and ignore rules present.

### M4 — Docker

- [x] Backend/frontend image build and Compose startup evidence.
- [x] Multi-stage frontend and non-root application runtimes.
- [x] Healthy three-service stack and Docker-served browser evidence.

### M5 — CI/CD

- [x] Workflow triggers on main pushes and runs tests/frontend build.
- [x] Backend/frontend images built and published to GHCR using commit-SHA tags.
- [x] Successful run URL and package screenshots recorded.

### M6 — DevSecOps

- [x] Both images scanned; HIGH/CRITICAL findings block publication.
- [x] Captured scan reports and scoped-result explanation provided.

### M7 — Terraform / AWS

- [x] Terraform configuration, provider lockfile, and credential-free example tfvars present.
- [x] Terraform initialization is indirectly evidenced by the successful non-empty saved plan; no separate `terraform init` screenshot is stored.
- [x] Two-public-subnet topology configured; real VPC, EKS and managed worker validated.
- [x] Final Terraform cleanup completion evidence recorded; AWS demonstration infrastructure destroyed.

### M8 — Kubernetes / Helm

- [x] Namespace manifest and complete chart; successful install/upgrade evidence.
- [x] Two backend/two frontend replicas, ClusterIP Services, and Running/Ready pods captured.
- [x] Minikube Ingress routes frontend/API; Helm release and browser evidence present.
- [x] Additional EKS application validation captured without persistent application storage or LoadBalancer.

### M9 — Observability

- [x] Metrics endpoint, Prometheus UP targets, and application query evidence.
- [x] Grafana accessible with a provisioned datasource/dashboard and populated request/status panel.

### M10 — Documentation / Presentation

- [x] Final project README with complete technical documentation.
- [x] Presentation slide deck committed under `demo/`.
- [x] Mandatory presentation/walkthrough video uploaded under `demo/`.
