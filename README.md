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

Want to see it in action? Check out our comprehensive demo guide:

📖 **[DEMO.md](./DEMO.md)** - Complete walkthrough with a realistic application setup

The demo includes:
- A full-stack web application (frontend + backend)
- Persistent storage with sample data
- ConfigMaps, Secrets, Services, and Ingress
- Step-by-step migration instructions
- Verification and troubleshooting tips

## How It Works

1. **Select Resources**: Interactive prompts let you choose which resources to migrate
2. **Clean Metadata**: System-generated fields are automatically removed
3. **Migrate Data**: PVC data is transferred using temporary pods and `tar` streaming
4. **Create Resources**: All selected resources are recreated in the destination namespace

## Project Structure

- `src/index.ts` - CLI entry point and user interaction flow
- `src/migrator.ts` - Core migration logic
- `src/k8s.ts` - Kubernetes API client wrapper
- `src/ui.ts` - Interactive UI components
- `test/test.yaml` - Complete demo application manifest

## License

ISC