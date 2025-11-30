# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

K8s Migrator is a CLI tool for cloning and migrating Kubernetes resources across namespaces. It provides an interactive interface for selecting and migrating Services, Deployments, ConfigMaps, Secrets, and PVCs (including volume data).

## Build and Run Commands

```bash
# Install dependencies
npm install

# Build TypeScript to JavaScript (outputs to dist/)
npm run build

# Run the CLI tool
npm start
```

No test suite is currently configured.

## Architecture

The codebase follows a clean separation of concerns across four main modules:

### Core Classes

- **K8sClient** (src/k8s.ts): Wraps @kubernetes/client-node APIs. Loads kubeconfig from default location and provides methods to list namespaces and resources (Services, Deployments, ConfigMaps, Secrets, PVCs). Exposes CoreV1Api and AppsV1Api for direct use.

- **UI** (src/ui.ts): Handles all user interaction via inquirer. Provides namespace selection, multi-select resource picking, confirmation prompts, and styled console output (info/success/error).

- **Migrator** (src/migrator.ts): Contains migration logic. Key responsibilities:
  - `cleanMetadata()`: Strips system-managed fields (uid, resourceVersion, etc.) from K8s resources before recreation. Also removes Service clusterIP fields.
  - `migrateResources()`: Orchestrates migration in order: ConfigMaps → Secrets → PVCs → Services → Deployments. This ordering ensures dependencies exist before dependent resources.
  - `migratePVCData()`: Creates temporary sender/receiver pods in source/dest namespaces, waits for them to be running, uses kubectl exec with tar piping to copy PVC data, then cleans up pods.

- **Main** (src/index.ts): Entry point. Orchestrates the workflow: display banner → select source/dest namespaces → fetch resources → select which to migrate → confirm → execute migration.

### Migration Flow

1. User selects source and destination namespaces
2. K8sClient lists all available resources in source namespace
3. UI presents multi-select checkboxes for each resource type
4. User confirms migration summary
5. Migrator processes resources in dependency order:
   - ConfigMaps and Secrets first (may be referenced by Deployments)
   - PVCs with data migration (uses temporary pods and kubectl tar piping)
   - Services
   - Deployments last

### PVC Data Migration

The PVC data transfer uses a pod-to-pod approach:
- Creates temporary alpine pods mounting source and destination PVCs
- Waits for both pods to reach Running state (60s timeout)
- Executes: `kubectl exec sender -- tar cf - | kubectl exec receiver -- tar xf -`
- Requires kubectl binary in PATH on the machine running this tool
- Always cleans up temporary pods, even on failure

## External Dependencies

- **kubectl**: Must be installed and in PATH for PVC data migration
- **Kubernetes cluster**: Tool uses current context from ~/.kube/config
- **@kubernetes/client-node**: Official Kubernetes JavaScript client
- **inquirer**: Interactive CLI prompts
- **chalk**: Terminal styling
- **ora**: Spinners (imported but not actively used in current code)
- **figlet**: ASCII art banner

## TypeScript Configuration

- Source: src/
- Output: dist/
- Target: ES2020
- Module: CommonJS
- Strict mode enabled
