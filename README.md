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
