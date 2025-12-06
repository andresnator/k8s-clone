# K8s Migrator - Gemini AI Context

CLI tool for cloning and migrating Kubernetes resources across namespaces with support for PVC data migration.

## Key Modules

- `index.ts`: Entry point and workflow orchestration
- `migrator.ts`: Core migration logic and PVC data transfer
- `k8s.ts`: K8sClient wrapper for Kubernetes API
- `ui.ts`: Interactive CLI with inquirer
- `resource-handlers.ts`: Resource-specific migration logic
- `metadata-cleaner.ts`: Strips system-generated metadata

## Commands

```bash
npm install && npm run build  # Setup
npm start                     # Run tool
npm test                      # Run tests
```

## Requirements

- Node.js v20+
- kubectl in PATH (for PVC data migration)
- Valid ~/.kube/config

## Development Notes

- TypeScript source in `src/`, compiled to `dist/`
- Use `K8sClient` class for Kubernetes API calls
- PVC data transfer uses `kubectl exec` with tar piping
- Migration order: ConfigMaps → Secrets → PVCs → Services → Deployments
