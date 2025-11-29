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

Before starting the demo, ensure you have:

1. **Kubernetes cluster** running (minikube, kind, or any K8s cluster)
2. **kubectl** installed and configured
3. **Node.js** (v20 or higher)
4. The K8s Migrator tool built and ready:
   ```bash
   npm install
   npm run build
   ```

## Step 1: Deploy the Demo Application

Deploy all resources to the source namespace:

```bash
kubectl apply -f demo/demo.yaml
```

This creates:
- Namespace: `source`
- All application resources within that namespace

### Verify Deployment

Check that all resources were created successfully:

```bash
# View all resources in the namespace
kubectl get all -n source

# Check ConfigMaps and Secrets
kubectl get configmap,secret -n source

# Check PersistentVolumes and Claims
kubectl get pv,pvc -n source

# Check Ingress
kubectl get ingress -n source
```

Expected output should show:
- 2 Deployments (backend-deployment, frontend-deployment)
- 2 Services (backend, frontend)
- 1 ConfigMap (app-config)
- 2 Secrets (db-credentials, tls-cert)
- 1 PVC (app-data-pvc)
- 1 Ingress (webapp-ingress)
- 1 Job (data-initializer)

### Wait for Pods to be Ready

```bash
kubectl wait --for=condition=ready pod -l app=webapp -n source --timeout=120s
```

### Verify PVC Data

The `data-initializer` Job should have populated the PVC with sample data. Verify this:

```bash
# List one of the backend pods
POD_NAME=$(kubectl get pods -n source -l tier=backend -o jsonpath='{.items[0].metadata.name}')

# Check the data in the PVC
kubectl exec -n source $POD_NAME -- ls -la /app/data
kubectl exec -n source $POD_NAME -- cat /app/data/file1.txt
kubectl exec -n source $POD_NAME -- cat /app/data/users.json
```

You should see:
- `file1.txt` - "Sample data file 1"
- `file2.txt` - "Sample data file 2"
- `users.json` - JSON with user data
- `logs/app.log` - Application log file

## Step 2: Verify Destination Namespace

The destination namespace `dest` is already created by the YAML file. Verify it exists:

```bash
kubectl get namespace dest
```

If for some reason you need to create it manually:

```bash
kubectl create namespace dest
```

## Step 3: Run the Migration Tool

Start the interactive migration process:

```bash
npm start
```

### Interactive Steps

The tool will guide you through:

1. **Select Source Namespace**
   - Choose: `source`

2. **Select Destination Namespace**
   - Choose: `dest`

3. **Select ConfigMaps**
   - Select: `app-config`

4. **Select Secrets**
   - Select: `db-credentials` and `tls-cert`

5. **Select PVCs**
   - Select: `app-data-pvc`
   - ⚠️ This will trigger data migration (may take a few minutes)

6. **Select Services**
   - Select: `backend` and `frontend`

7. **Select Deployments**
   - Select: `backend-deployment` and `frontend-deployment`

8. **Confirm Migration**
   - Review the summary
   - Confirm: `Yes`

### Migration Process

The tool will:
1. ✅ Migrate ConfigMaps
2. ✅ Migrate Secrets
3. ✅ Create new PVCs in destination
4. ✅ Transfer PVC data using temporary pods
5. ✅ Migrate Services
6. ✅ Migrate Deployments

## Step 4: Verify the Migration

### Check Destination Namespace

```bash
# View all migrated resources
kubectl get all -n dest

# Compare with source
kubectl get all -n source
```

### Verify ConfigMaps and Secrets

```bash
# Check ConfigMap was migrated
kubectl get configmap app-config -n dest -o yaml

# Verify Secrets (data should be identical)
kubectl get secret db-credentials -n dest -o yaml
kubectl get secret tls-cert -n dest -o yaml
```

### Verify PVC Data Migration

This is the most important verification - ensuring data was copied correctly:

```bash
# Get a pod from the destination namespace
DEST_POD=$(kubectl get pods -n dest -l tier=backend -o jsonpath='{.items[0].metadata.name}')

# Wait for the pod to be ready
kubectl wait --for=condition=ready pod/$DEST_POD -n dest --timeout=120s

# Check the migrated data
kubectl exec -n dest $DEST_POD -- ls -la /app/data
kubectl exec -n dest $DEST_POD -- cat /app/data/file1.txt
kubectl exec -n dest $DEST_POD -- cat /app/data/file2.txt
kubectl exec -n dest $DEST_POD -- cat /app/data/users.json
kubectl exec -n dest $DEST_POD -- cat /app/data/logs/app.log
```

All files should match the source namespace exactly.

### Compare Services

```bash
# Source service
kubectl get svc backend -n source -o yaml | grep -v "uid:\|resourceVersion:\|creationTimestamp:\|namespace: source"

# Destination service
kubectl get svc backend -n dest -o yaml | grep -v "uid:\|resourceVersion:\|creationTimestamp:\|namespace: dest"
```

The services should be identical except for namespace and system-generated fields.

### Verify Deployments

```bash
# Check deployment replicas
kubectl get deployment -n source
kubectl get deployment -n dest

# Verify pods are running
kubectl get pods -n dest -l app=webapp
```

## Step 5: Test the Migrated Application

### Port-Forward to Test Services

Test the frontend service in the destination namespace:

```bash
# Port-forward to the frontend service
kubectl port-forward -n dest svc/frontend 8080:80
```

In another terminal:
```bash
curl http://localhost:8080
```

### Test Backend Service

```bash
# Port-forward to the backend service
kubectl port-forward -n dest svc/backend 3000:3000
```

### Test Ingress (Optional)

If you want to access the application via `webapp.local`, you need to add the Ingress IP to your `/etc/hosts` file.

1. Get the Ingress IP (if using Minikube, run `minikube tunnel` in a separate terminal first):
   ```bash
   kubectl get ingress -n dest
   ```
2. Add the entry to `/etc/hosts`:
   ```
   <INGRESS_IP> webapp.local
   ```
3. Then you can access `http://webapp.local` in your browser or via curl.


## Step 6: Cleanup

When you're done with the demo:

```bash
# Delete source namespace
kubectl delete namespace source

# Delete destination namespace
kubectl delete namespace dest

# Delete the PersistentVolume (if using hostPath)
kubectl delete pv source-data-pv
```

## Troubleshooting

### PVC Data Migration Fails

If the data migration step fails:

1. **Check kubectl is in PATH**:
   ```bash
   which kubectl
   ```

2. **Verify PVC is bound**:
   ```bash
   kubectl get pvc -n source
   kubectl get pvc -n dest
   ```

3. **Check migration pod logs**:
   ```bash
   kubectl logs -n source -l app=migration-sender
   kubectl logs -n dest -l app=migration-receiver
   ```

### Pods Not Starting

If pods don't start in the destination namespace:

1. **Check pod status**:
   ```bash
   kubectl get pods -n dest
   kubectl describe pod <pod-name> -n dest
   ```

2. **Common issues**:
   - ConfigMap or Secret not migrated yet
   - PVC not bound
   - Image pull errors

### Services Not Accessible

If services aren't accessible:

1. **Check service endpoints**:
   ```bash
   kubectl get endpoints -n dest
   ```

2. **Verify pod labels match service selectors**:
   ```bash
   kubectl get pods -n dest --show-labels
   kubectl get svc backend -n dest -o yaml | grep selector
   ```

## Advanced Demo Scenarios

### Partial Migration

Try migrating only specific resources:
- Migrate only ConfigMaps and Secrets (configuration only)
- Migrate only Services (networking only)
- Migrate only Deployments without PVCs (stateless apps)

### Cross-Cluster Migration

If you have access to multiple clusters:
1. Export resources from source cluster
2. Switch kubectl context
3. Import to destination cluster

### Migration with Modifications

After migration, try modifying resources in the destination:
- Scale deployments differently
- Change service types (ClusterIP → NodePort)
- Update ConfigMap values

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
