# K8s Migrator

![K8s Migrator - Kubernetes Resource Migration Tool](https://github.com/user-attachments/assets/098bafdc-260d-432a-ae0a-0646c056e597)

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

```bash
npm install -g @andresnator/k8s-clone
```

## Configuration

The tool stores configuration at `~/.k8s-clone/config`. Configuration is optional—if not provided, the tool auto-detects clusters from `~/.kube/config`. See `config.example.json` in the project root for structure.

## Usage

```bash
k8s-clone
```

Follow the interactive prompts to select source/destination namespaces and resources to migrate.

## Demo

See the tool in action with a full-stack application example in **[DEMO.md](./DEMO.md)**.
 
## Multi-Cluster Setup

Use Minikube profiles for testing cross-cluster migration:

```bash
minikube start -p source
minikube start -p dest
kubectl --context source apply -f demo/demo.yaml
kubectl --context dest create namespace dest
k8s-clone
```

## How It Works

1. Select source/destination clusters and namespaces
2. Choose resources to migrate via interactive prompts
3. System-generated metadata is automatically cleaned
4. PVC data transfers via temporary pods using `tar` streaming
5. Resources are recreated in the destination namespace

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

## Development

```bash
git clone https://github.com/andresnator/k8s-clone.git
cd k8s-clone
npm install
npm run build
npm test
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines on how to contribute, including our commit message conventions and automated release process.

## License

This project is licensed under the MIT License — see the `LICENSE` file for details.

SPDX-License-Identifier: MIT