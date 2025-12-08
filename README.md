
<img width="1191" height="295" alt="image" src="https://github.com/user-attachments/assets/c57244ee-c09a-44ea-95bd-5e81d3bc6da5" />


# K8s Migrator

[![CI](https://github.com/andresnator/k8s-clone/actions/workflows/ci.yml/badge.svg)](https://github.com/andresnator/k8s-clone/actions/workflows/ci.yml)
[![CodeQL](https://github.com/andresnator/k8s-clone/actions/workflows/codeql.yml/badge.svg)](https://github.com/andresnator/k8s-clone/actions/workflows/codeql.yml)
[![npm version](https://badge.fury.io/js/@andresnator%2Fk8s-clone.svg)](https://badge.fury.io/js/@andresnator%2Fk8s-clone)
[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-support-yellow.svg)](https://buymeacoffee.com/andresnator)

A CLI tool to clone and migrate Kubernetes resources across namespaces.

## Features

- Granular selection of resources (Services, Deployments, ConfigMaps, Secrets, PVCs).
- PVC data migration (copies volume contents).
- Friendly interactive interface.
- Automatic update notifications - displays when a newer version is available on npm.
- **Custom Apps** - Group and deploy related Kubernetes resources as configurable applications (see [CUSTOM_APPS.md](./CUSTOM_APPS.md)).

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

k8s-clone uses an optional configuration file at `~/.k8s-clone/config.yaml` to store default cluster and namespace settings.

**Setup**: Run `npm run setup` to create the configuration directory and file automatically.

**Custom Location**: Set `K8S_CLONE_CONFIG` environment variable to use a different path.

**Behavior**: When empty, the tool auto-detects clusters from `~/.kube/config` and fetches resources via Kubernetes API. When populated, it uses pre-configured values. See `config.example.yaml` for structure details.

### Environment Variables

- `K8S_CLONE_CONFIG`: Set a custom path for the configuration file (default: `~/.k8s-clone/config.yaml`)
- `K8S_CLONE_SKIP_VERSION_CHECK`: Set to any truthy value (`true`, `1`, `yes`, or any non-empty string) to skip version update checks (useful for CI/CD environments)

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

### Command-Line Options

- `--version, -v`: Display the current version number
- `--help, -h`: Display help information

## Custom Apps

The **Custom Apps** feature allows you to group related Kubernetes resources into logical applications and deploy them as a unit with optional spec overrides.

**Key Features:**
- Define applications once in config, deploy multiple times
- Override resource specs per environment (e.g., replica counts, storage sizes)
- Support for deep nesting in overwrite-spec
- Duplicate resource detection and warnings

For complete documentation, examples, and troubleshooting, see **[CUSTOM_APPS.md](./CUSTOM_APPS.md)**.

## Demo

Want to see it in action? We have prepared a comprehensive **[Demo Guide](./DEMO.md)** that walks you through a realistic migration scenario.

The demo uses a full-stack application (Frontend + Backend + Database) with persistent storage to showcase:
- **Stateful Migration**: Moving PVCs with actual data.
- **Configuration Handling**: Migrating ConfigMaps and Secrets.
- **Networking**: Preserving Services and Ingress rules.

Check out **[DEMO.md](./DEMO.md)** for step-by-step instructions on how to deploy the test app and run the migration.
 
## Multi-Cluster Setup

For testing with Minikube profiles, see the detailed [Demo Guide](./DEMO.md) which includes multi-cluster migration scenarios.

## How It Works

1. **Select Contexts & Namespaces**: Choose source/destination clusters and namespaces
2. **Select Resources**: Interactive prompts let you choose which resources to migrate
3. **Clean Metadata**: System-generated fields are automatically removed
4. **Migrate Data**: PVC data is transferred using temporary pods and `tar` streaming
5. **Create Resources**: All selected resources are recreated in the destination namespace

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
