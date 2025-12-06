# K8s Migrator

[![CI](https://github.com/andresnator/k8s-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/andresnator/k8s-clone/actions/workflows/ci.yml)
[![CodeQL](https://github.com/andresnator/k8s-clone/actions/workflows/codeql.yml/badge.svg)](https://github.com/andresnator/k8s-clone/actions/workflows/codeql.yml)
[![npm version](https://badge.fury.io/js/@andresnator%2Fk8s-clone.svg)](https://badge.fury.io/js/@andresnator%2Fk8s-clone)

A CLI tool to clone and migrate Kubernetes resources across namespaces.

## Features

- Granular selection of resources (Services, Deployments, ConfigMaps, Secrets, PVCs).
- PVC data migration (copies volume contents).
- Friendly interactive interface.

## Requirements

- Node.js (Tested on v20.x and v22.x)
- `kubectl` installed and available in your PATH.
- Access to a Kubernetes cluster (current context in `~/.kube/config`).

## Installation

### Global Installation (Recommended)

Install `k8s-clone` globally from npm:

```bash
npm install -g @andresnator/k8s-clone
```

Then run:

```bash
k8s-clone
```

### Local Development

```bash
git clone https://github.com/andresnator/k8s-clone.git
cd k8s-clone
npm install
npm run build
```

## Configuration

k8s-clone uses a configuration file to store default cluster and namespace settings. This allows you to pre-configure your frequently used clusters and resources.

### Configuration File Location

The configuration file is located at `~/.k8s-clone/config` by default. During installation, a setup script automatically:

1. Creates the `~/.k8s-clone/` directory
2. Creates an empty configuration file with the required structure
3. Adds the `K8S_CLONE_CONFIG` environment variable to your shell configuration (`.zshrc`, `.bash_profile`, or detected default)

### Environment Variable

You can customize the configuration file location by setting the `K8S_CLONE_CONFIG` environment variable:

```bash
# Default (set automatically during installation)
export K8S_CLONE_CONFIG="$HOME/.k8s-clone/config"

# Or use a custom location
export K8S_CLONE_CONFIG="/path/to/your/config"
```

### Configuration File Structure

The configuration file uses JSON format with the following structure:

```json
{
    "clusters": [],
    "namespaces": {},
    "services": {},
    "deployments": {},
    "configMaps": {},
    "secrets": {},
    "persistentVolumeClaims": {}
}
```

### Example Configuration

Here's a complete example with clusters and resources configured:

```json
{
    "clusters": [
        { "name": "production" },
        { "name": "staging" }
    ],
    "namespaces": {
        "production": [
            { "name": "app-ns" },
            { "name": "monitoring" }
        ],
        "staging": [
            { "name": "test-ns" }
        ]
    },
    "services": {
        "app-ns": [
            { "name": "backend-service" },
            { "name": "frontend-service" }
        ]
    },
    "deployments": {
        "app-ns": [
            { "name": "backend-deployment" },
            { "name": "frontend-deployment" }
        ]
    },
    "configMaps": {
        "app-ns": [
            { "name": "app-config" }
        ]
    },
    "secrets": {
        "app-ns": [
            { "name": "db-credentials" }
        ]
    },
    "persistentVolumeClaims": {
        "app-ns": [
            { "name": "data-pvc" }
        ]
    }
}
```

### Configuration Behavior

- **When configuration is empty**: The tool automatically detects clusters from `~/.kube/config` and fetches resources from the Kubernetes API
- **When configuration has data**: The tool uses the pre-configured values instead of making API calls
- **Mixed usage**: You can configure some sections while leaving others empty for automatic detection

### Manual Setup

If you need to run the setup script manually (e.g., after updating your shell or moving to a new machine):

```bash
npm run setup
```

Or run the script directly:

```bash
bash scripts/setup.sh
```

## Usage

If installed globally:

```bash
k8s-clone
```

If running locally:

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
- `scripts/setup.sh` - Configuration setup script
- `demo/demo.yaml` - Complete demo application manifest

## Testing

To run the unit tests:

```bash
npm test
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute, including our commit message conventions and automated release process.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

SPDX-License-Identifier: MIT