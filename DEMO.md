# Demo Guide - K8s Migrator

This guide walks you through a complete demonstration of the K8s Migrator tool using a realistic Kubernetes application setup.

## Overview

The demo uses a complete web application stack:
- Frontend (Nginx, 3 replicas) + Backend (Node.js, 2 replicas)
- Persistent Storage with sample data
- ConfigMaps, Secrets, Services, and Ingress

## Prerequisites

- Kubernetes cluster (minikube, kind, or any K8s cluster)
- kubectl installed and configured
- Node.js v20 or higher
- K8s Migrator built: `npm install && npm run build`

## Step 1: Deploy the Demo Application

Deploy all resources to the source namespace:

```bash
kubectl apply -f demo/demo.yaml
```

This creates the `source` namespace with:
- 2 Deployments, 2 Services, 1 ConfigMap, 2 Secrets, 1 PVC, 1 Ingress, 1 Job

### Verify Deployment

```bash
kubectl get all,configmap,secret,pvc,ingress -n source
```

### Wait for Pods to be Ready

```bash
kubectl wait --for=condition=ready pod -l app=webapp -n source --timeout=120s
```

### Verify PVC Data

```bash
POD_NAME=$(kubectl get pods -n source -l tier=backend -o jsonpath='{.items[0].metadata.name}')
kubectl exec -n source $POD_NAME -- ls -la /app/data
```

Expected files: `file1.txt`, `file2.txt`, `users.json`, `logs/app.log`

## Step 2: Create Destination Namespace

```bash
kubectl create namespace dest
```

## Step 3: Run the Migration Tool

Start the interactive migration process:

```bash
npm start
```

### Interactive Steps

Follow the prompts to select:
- Source/destination contexts (e.g., `source`/`dest` or `minikube`)
- Source namespace: `source`, Destination namespace: `dest`
- All resources: ConfigMaps, Secrets, PVCs, Services, Deployments

The tool will migrate resources in order: ConfigMaps → Secrets → PVCs (with data) → Services → Deployments


## Step 4: Verify the Migration

### Check Migrated Resources

```bash
kubectl get all,configmap,secret,pvc -n dest
```

### Verify PVC Data Migration

```bash
DEST_POD=$(kubectl get pods -n dest -l tier=backend -o jsonpath='{.items[0].metadata.name}')
kubectl wait --for=condition=ready pod/$DEST_POD -n dest --timeout=120s
kubectl exec -n dest $DEST_POD -- ls -la /app/data
```

All files should match the source namespace exactly.

## Step 5: Test the Migrated Application

```bash
# Test frontend
kubectl port-forward -n dest svc/frontend 8080:80

# Test backend (in another terminal)
kubectl port-forward -n dest svc/backend 3000:3000
```

**Optional - Test Ingress**: Get Ingress IP with `kubectl get ingress -n dest`, add to `/etc/hosts`, and access `http://webapp.local`


## Step 6: Cleanup

```bash
kubectl delete namespace source dest
kubectl delete pv source-data-pv  # if using hostPath
```

## Troubleshooting

**PVC Migration Fails**: Check `which kubectl`, verify PVCs are bound, check migration pod logs  
**Pods Not Starting**: Check pod status with `kubectl describe`, verify ConfigMaps/Secrets migrated, check PVC binding  
**Services Not Accessible**: Verify endpoints exist and pod labels match service selectors

## Advanced Scenarios

- **Partial Migration**: Migrate only specific resource types (e.g., ConfigMaps/Secrets only)
- **Cross-Cluster**: Use different contexts for source and destination
- **Modifications**: After migration, scale deployments or change service types as needed

## Summary

This demo showcases the K8s Migrator's ability to:
- ✅ Clone complete application stacks
- ✅ Migrate persistent data between PVCs
- ✅ Preserve configurations and secrets
- ✅ Maintain service definitions
- ✅ Replicate deployment specifications

The tool is particularly useful for:
- Creating staging environments from production
- Disaster recovery scenarios
- Multi-tenant namespace management
- Development environment provisioning
