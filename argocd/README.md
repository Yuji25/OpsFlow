# OpsFlow GitOps with Argo CD

Public GitHub `main` → Argo CD → `helm/opsflow` with `values-minikube.yaml` → the existing Minikube `opsflow` namespace. AWS is not involved.

## Install and apply

Use the existing Minikube profile; if it is stopped, run `minikube -p minikube start` without changing its saved settings. Check for an existing Argo CD installation before installing. The official non-HA manifests used for this local demonstration are pinned to v3.5.5:

```bash
kubectl --context minikube create namespace argocd
kubectl --context minikube apply --server-side -n argocd \
  -f https://raw.githubusercontent.com/argoproj/argo-cd/v3.5.5/manifests/install.yaml
kubectl --context minikube -n argocd wait --for=condition=Ready pod --all --timeout=10m
kubectl --context minikube apply -f argocd/opsflow-application.yaml
```

The Application and Helm release names both remain `opsflow`, preserving resource names/selectors. Argo CD renders Helm templates and adopts the existing resources in place; it does not run `helm upgrade` or remove the old Helm release records. After adoption, use Git/Argo CD for changes and do not run manual Helm upgrades, rollbacks, or uninstall against this release. Existing Helm records remain historical, not the current GitOps deployment state.

Automatic sync and self-healing are enabled, but **automatic pruning is disabled** to protect existing resources and PostgreSQL data. Do not select Prune/Force/Replace during a manual sync. The Application has no cascading-deletion finalizer. The existing PVC and its Helm retention annotation are preserved; neither is permission to delete the namespace or storage. Namespace creation is unnecessary because `opsflow` already exists.

The chart's regular migration Job renders as `opsflow-migrate-1` under Argo CD, which does not increment Helm release revisions. Its ten-minute TTL can cause self-healing to recreate the missing Job and rerun idempotent `alembic upgrade head`. A brief OutOfSync/Progressing interval during that reconciliation is expected; do not change the chart or force-replace Jobs merely for the video.

## Verify and open the UI

```bash
kubectl --context minikube -n argocd get pods
kubectl --context minikube -n argocd get applications.argoproj.io
kubectl --context minikube -n argocd get application opsflow -o wide
kubectl --context minikube -n argocd get application opsflow -o yaml
kubectl --context minikube -n opsflow get pods,svc,ingress,pvc,hpa
kubectl --context minikube -n argocd port-forward svc/argocd-server 8081:443
```

Open **https://localhost:8081** and accept the local self-signed certificate warning. Log in as `admin`; retrieve the initial password locally in a separate terminal, never in a recording or shared log:

```bash
kubectl --context minikube -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath='{.data.password}' | base64 --decode
```

Do not save or commit the password. Show the `opsflow` Application card with **Synced / Healthy**, then its details: public repository URL, revision `main`, source path `helm/opsflow`, destination `https://kubernetes.default.svc` / `opsflow`, and resource tree. Show the existing Deployments, Services, Ingress, HPA and Bound PostgreSQL PVC. The local Application manifest must eventually be reviewed/committed by the owner; until then, Argo CD still reads the application chart from the published Git branch.

## One reversible video change

No demo change is included in this integration. During recording, the owner can add this single override to **`helm/opsflow/values-minikube.yaml`**:

```yaml
hpa:
  maxReplicas: 3
```

This changes the existing backend HPA maximum from four to three while retaining the minimum of two; with the validated two replicas at idle, it neither changes application code nor touches PostgreSQL. Check the current backend replica count is two before recording. Commit/push that values change yourself, use **Refresh** in Argo CD, and show the HPA diff (`maxReplicas: 4 → 3`) and automatic synchronization to **Synced / Healthy**. Auto-sync may be too fast to capture OutOfSync; use the recorded sync operation/diff rather than claiming a state you did not observe.

Verify `kubectl --context minikube -n opsflow get hpa opsflow-backend`. Revert the single override through Git and let Argo CD restore four, or retain three for the local demo. Never use a PVC/credential/image change as the demonstration. Application-spec edits are not watched from Git by this single-Application setup; demonstrate a chart-values change instead.

[Official installation guide](https://argo-cd.readthedocs.io/en/stable/getting_started/) · [Helm integration and lifecycle](https://argo-cd.readthedocs.io/en/stable/user-guide/helm/)
