# K8s Migrator

A CLI tool to clone and migrate Kubernetes resources across namespaces.

## Features

- Granular selection of resources (Services, Deployments, ConfigMaps, Secrets, PVCs).
- PVC data migration (copies volume contents).
- Friendly interactive interface.

## Requirements

- Node.js
- `kubectl` installed and available in your PATH.
- Access to a Kubernetes cluster (current context in `~/.kube/config`).

## Installation

```bash
npm install
npm run build
```

## Usage

```bash
npm start
```

Follow the on‑screen prompts to choose the source namespace, the destination namespace, and the resources you wish to migrate.

## Demo

Want to see it in action? We have prepared a comprehensive **[Demo Guide](./DEMO.md)** that walks you through a realistic migration scenario.

The demo uses a full-stack application (Frontend + Backend + Database) with persistent storage to showcase:
- **Stateful Migration**: Moving PVCs with actual data.
- **Configuration Handling**: Migrating ConfigMaps and Secrets.
- **Networking**: Preserving Services and Ingress rules.

Check out **[DEMO.md](./DEMO.md)** for step-by-step instructions on how to deploy the test app and run the migration.
 
## Multi-Cluster Setup (Minikube)

To test migration between two clusters, you can use Minikube profiles:

1.  **Start Source Cluster**:
    ```bash
    minikube start -p source
    ```

2.  **Start Destination Cluster**:
    ```bash
    minikube start -p dest
    ```

3.  **Apply Demo Resources to Source**:
    ```bash
    kubectl --context source apply -f demo/demo.yaml
    ```

4.  **Create Destination Namespace in Dest Cluster**:
    ```bash
    kubectl --context dest create namespace dest
    ```

5.  **Run Migrator**:
    ```bash
    npm start
    ```
    - Select `source` as Source Context.
    - Select `dest` as Destination Context.
    - Select `source` as Source Namespace.
    - Select `dest` as Destination Namespace.

## How It Works

1. **Select Contexts & Namespaces**: Choose source/destination clusters and namespaces
2. **Select Resources**: Interactive prompts let you choose which resources to migrate
2. **Clean Metadata**: System-generated fields are automatically removed
3. **Migrate Data**: PVC data is transferred using temporary pods and `tar` streaming
4. **Create Resources**: All selected resources are recreated in the destination namespace

## Project Structure

- `src/index.ts` - CLI entry point and user interaction flow
- `src/migrator.ts` - Core migration logic
- `src/cleaner.ts` - Resource cleanup logic
- `src/k8s.ts` - Kubernetes API client wrapper
- `src/ui.ts` - Interactive UI components
- `src/config.ts` - Configuration management
- `src/metadata-cleaner.ts` - Metadata cleaning utilities
- `src/resource-handlers.ts` - Resource-specific handling logic
- `src/types.ts` - TypeScript type definitions
- `src/Banner.tsx` - Banner component
- `demo/demo.yaml` - Complete demo application manifest

## Testing

To run the unit tests:

```bash
npm test
```

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

SPDX-License-Identifier: MIT