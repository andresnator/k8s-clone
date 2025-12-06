# Demo Guide - K8s Migrator

This guide walks you through a complete demonstration of the K8s Migrator tool using a realistic Kubernetes application setup.

## Overview

The demo includes a complete web application stack with:
- **Frontend**: Nginx reverse proxy (3 replicas)
- **Backend**: Node.js application (2 replicas)
- **Persistent Storage**: PVC with sample data files
- **Configuration**: ConfigMaps for app settings
- **Secrets**: Database credentials and TLS certificates
- **Networking**: Services and Ingress for external access

## Prerequisites

- Kubernetes cluster (minikube, kind, or any K8s cluster)
- `kubectl` installed and configured
- Node.js v20 or higher
- K8s Migrator: `npm install && npm run build`

## Step 1: Deploy the Demo Application

```bash
kubectl apply -f demo/demo.yaml
kubectl wait --for=condition=ready pod -l app=webapp -n source --timeout=120s
```

Verify deployment:
```bash
kubectl get all,configmap,secret,pvc,ingress -n source
```

Expected: 2 Deployments, 2 Services, 1 ConfigMap, 2 Secrets, 1 PVC, 1 Ingress, 1 Job

Verify PVC data:
```bash
POD_NAME=$(kubectl get pods -n source -l tier=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n source $POD_NAME -- ls /app/data
```

## Step 2: Create Destination Namespace

```bash
kubectl create namespace dest
```

## Step 3: Run the Migration Tool

```bash
npm start
```

Follow the interactive prompts to:
1. Select source/destination contexts and namespaces (`source` → `dest`)
2. Choose resources: ConfigMaps, Secrets, PVCs, Services, Deployments
3. Confirm migration

The tool migrates in order: ConfigMaps → Secrets → PVCs (with data) → Services → Deployments

## Step 4: Verify the Migration

```bash
# Check all resources
kubectl get all,configmap,secret,pvc -n dest

# Verify PVC data
DEST_POD=$(kubectl get pods -n dest -l tier=backend -o jsonpath='{.items[0].metadata.name}')
kubectl wait --for=condition=ready pod/$DEST_POD -n dest --timeout=120s
kubectl exec -n dest $DEST_POD -- ls /app/data
```

All files should match the source namespace exactly.

## Step 5: Test the Migrated Application

```bash
kubectl port-forward -n dest svc/frontend 8080:80
curl http://localhost:8080
```

## Step 6: Cleanup

```bash
kubectl delete namespace source dest
kubectl delete pv source-data-pv
```

## Troubleshooting

**PVC migration fails**: Check `kubectl` is in PATH and PVCs are bound.

**Pods not starting**: Verify ConfigMaps/Secrets migrated and PVCs are bound.

**Services inaccessible**: Check endpoints and pod labels match service selectors.

## Use Cases

The K8s Migrator is useful for:
- Creating staging environments from production
- Disaster recovery scenarios
- Multi-tenant namespace management
- Development environment provisioning
