# DevTools CLI

**DevTools CLI** is a unified management console designed to centralize and streamline access to various developer utilities and agents. It serves as a parent launcher, allowing you to easily switch between different applications from a single interface.

## Features

*   **Centralized Hub**: Access multiple tools from one command line interface.
*   **Interactive Menu**: Simple, keyboard-navigable menu system.
*   **Extensible**: Easily add new applications to the suite.
*   **Unified Experience**: Consistent entry point for your development workflow.

## Included Applications

Currently, the suite includes the following tools:

1.  **K8s Migrator**: A powerful CLI tool for cloning and migrating Kubernetes resources (Services, Deployments, ConfigMaps, Secrets, PVCs) between namespaces.
2.  **Wiki Agent**: An example agent application demonstrating integration capabilities.

## Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd devtools-cli
    ```

2.  Install dependencies:
    ```bash
    npm install
    ```

    *Note: This will also install dependencies for the child applications located in `apps/`.*

## Usage

To start the main console:

```bash
npm start
```

Use the arrow keys to navigate the menu and `Enter` to select an application.

## Project Structure

```
.
├── apps/               # Directory containing child applications
│   ├── k8s-migrator/   # Kubernetes migration tool
│   └── wiki-agent/     # Example agent application
├── src/                # Source code for the DevTools CLI launcher
├── package.json        # Root package configuration
└── README.md           # This documentation
```

## Adding New Tools

To add a new tool to DevTools CLI:

1.  Create a new directory in `apps/` for your application.
2.  Ensure your application has its own `package.json` and start script.
3.  Register the new application in `src/index.ts` by adding it to the `apps` array:

    ```typescript
    const apps = [
        // ... existing apps
        {
            name: 'My New Tool',
            value: 'my-new-tool',
            path: '../apps/my-new-tool',
            command: 'npm',
            args: ['start']
        }
    ];
    ```

## License

ISC
