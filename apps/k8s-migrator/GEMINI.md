# K8s Migrator (nodal-magnetar)

## Project Overview

**K8s Migrator** is a CLI tool designed to clone and migrate Kubernetes resources between namespaces. It allows for granular selection of resources and includes a robust mechanism for migrating PersistentVolumeClaim (PVC) data.

### Key Features
*   **Resource Migration:** Supports Services, Deployments, ConfigMaps, Secrets, and PVCs.
*   **Data Migration:** Automates the transfer of PVC data by spinning up temporary ephemeral pods in both source and destination namespaces and piping data via `tar` over `kubectl exec`.
*   **Interactive CLI:** Uses `inquirer` to guide the user through namespace selection and resource filtering.
*   **Metadata Cleaning:** Automatically strips system-generated metadata (UIDs, resourceVersions, etc.) to ensure clean creation in the new namespace.

### Architecture
*   **`src/index.ts`**: The entry point. Orchestrates the user flow, gathers inputs, and triggers the migration process.
*   **`src/migrator.ts`**: Contains the core business logic.
    *   `migrateResources()`: Iterates through selected resources, cleans their metadata, and creates them in the destination namespace.
    *   `migratePVCData()`: Handles the complex logic of creating `alpine` pods, waiting for them to be ready, and executing the shell command to transfer data.
*   **`src/k8s.ts`**: A wrapper class (`K8sClient`) around the official `@kubernetes/client-node` library, abstracting API calls for listing and retrieving resources.

## Building and Running

### Prerequisites
*   Node.js
*   `kubectl` installed and configured in your PATH (required for PVC data transfer).
*   A valid Kubernetes configuration (`~/.kube/config`) with access to the target cluster.

### Setup
1.  Install dependencies:
    ```bash
    npm install
    ```
2.  Build the TypeScript source:
    ```bash
    npm run build
    ```

### Execution
To run the tool interactively:
```bash
npm start
```

## Development Conventions

*   **Language:** TypeScript.
*   **Code Structure:**
    *   Source code resides in `src/`.
    *   Compiled JavaScript is output to `dist/`.
*   **Kubernetes Interaction:**
    *   Use the `K8sClient` class in `src/k8s.ts` for all Kubernetes API interactions.
    *   The project relies on `child_process.spawn` to execute raw `kubectl` commands for the data piping phase, as this is currently more efficient/reliable than streaming through the Node.js client for this specific use case.
*   **Error Handling:** The `UI` class (implied) and standard `console` logging are used for feedback. The migration process attempts to catch errors per resource to prevent a single failure from stopping the entire batch, though critical setup failures will exit the process.
