# Custom Apps Feature

## Introduction

The **Custom Apps** feature allows you to group related Kubernetes resources into logical applications and deploy them as a unit. Instead of manually selecting individual resources each time, you can define an application once in your configuration file and deploy it with a single command.

This feature is particularly useful for:
- Deploying complete applications across different environments
- Maintaining consistent resource configurations
- Overriding specific resource specifications per environment
- Streamlining repetitive deployment tasks

## Configuration Structure

Custom apps are defined in the `apps` array within your k8s-clone configuration file (default: `~/.k8s-clone/config`).

### Basic Structure

```json
{
  "apps": [
    {
      "name": "string",
      "context": "string",
      "namespaces": "string",
      "services": [],
      "deployments": [],
      "configMaps": [],
      "secrets": [],
      "persistentVolumeClaims": []
    }
  ]
}
```

### Field Descriptions

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Unique identifier for the application |
| `context` | string | Yes | Source Kubernetes cluster context |
| `namespaces` | string | Yes | Source namespace where resources are located |
| `services` | array | No | List of Service resources to include |
| `deployments` | array | No | List of Deployment resources to include |
| `configMaps` | array | No | List of ConfigMap resources to include |
| `secrets` | array | No | List of Secret resources to include |
| `persistentVolumeClaims` | array | No | List of PersistentVolumeClaim resources to include |

### Resource Format

Each resource in the arrays can be defined in two ways:

**Simple format** (resource name only):
```json
{
  "resource": "my-service"
}
```

**With overwrite-spec** (includes specification overrides):
```json
{
  "resource": "my-deployment",
  "overwrite-spec": {
    "replicas": 3
  }
}
```

## Adding a New Application

1. **Locate your configuration file**: By default, it's at `~/.k8s-clone/config`. You can also use a custom path via the `K8S_CLONE_CONFIG` environment variable.

2. **Add an app entry** to the `apps` array:

```json
{
  "apps": [
    {
      "name": "my-web-app",
      "context": "production",
      "namespaces": "prod-namespace",
      "services": [
        {"resource": "web-service"},
        {"resource": "api-service"}
      ],
      "deployments": [
        {"resource": "web-deployment"},
        {"resource": "api-deployment"}
      ],
      "configMaps": [
        {"resource": "app-config"}
      ],
      "secrets": [
        {"resource": "app-secrets"}
      ]
    }
  ]
}
```

3. **Save the file** and the app will be available in the "Apps" menu.

## Using overwrite-spec

The `overwrite-spec` feature allows you to override specific resource specifications before deployment. This is useful for adjusting configurations when deploying to different environments.

### How It Works

- Only the fields specified in `overwrite-spec` are modified
- All other fields remain unchanged from the source resource
- Supports deep nesting of properties
- Values are merged into the resource's `spec` field

### Examples

#### Overriding Deployment Replicas

```json
{
  "resource": "backend-deployment",
  "overwrite-spec": {
    "replicas": 5
  }
}
```

This changes the replica count to 5, while keeping all other deployment specifications intact.

#### Overriding PVC Storage Capacity

```json
{
  "resource": "data-pvc",
  "overwrite-spec": {
    "resources": {
      "requests": {
        "storage": "100Gi"
      }
    }
  }
}
```

This sets the storage capacity to 100Gi, preserving other PVC settings.

#### Overriding Multiple Nested Properties

```json
{
  "resource": "api-deployment",
  "overwrite-spec": {
    "replicas": 3,
    "template": {
      "spec": {
        "containers": [{
          "name": "api",
          "resources": {
            "limits": {
              "memory": "512Mi"
            }
          }
        }]
      }
    }
  }
}
```

### Important Notes

- The overwrite happens **after** the resource is fetched from the source cluster but **before** it's created in the destination
- Array values are **replaced entirely**, not merged
- Use `overwrite-spec` carefully to avoid breaking resource configurations
- Always test in a non-production environment first

## Common Use Cases

### 1. Development to Staging Deployment

Deploy an app from development to staging with increased replicas:

```json
{
  "name": "my-app-staging",
  "context": "dev-cluster",
  "namespaces": "dev",
  "deployments": [
    {
      "resource": "app-deployment",
      "overwrite-spec": {
        "replicas": 3
      }
    }
  ]
}
```

### 2. Multi-Service Application

Group all related microservices:

```json
{
  "name": "ecommerce-platform",
  "context": "production",
  "namespaces": "prod",
  "services": [
    {"resource": "frontend"},
    {"resource": "backend"},
    {"resource": "payment-gateway"},
    {"resource": "inventory"}
  ],
  "deployments": [
    {"resource": "frontend-deployment"},
    {"resource": "backend-deployment"},
    {"resource": "payment-gateway-deployment"},
    {"resource": "inventory-deployment"}
  ],
  "configMaps": [
    {"resource": "app-config"}
  ],
  "secrets": [
    {"resource": "db-credentials"},
    {"resource": "api-keys"}
  ]
}
```

### 3. Different Storage Requirements per Environment

```json
{
  "name": "database-app",
  "context": "dev-cluster",
  "namespaces": "dev",
  "persistentVolumeClaims": [
    {
      "resource": "db-data",
      "overwrite-spec": {
        "resources": {
          "requests": {
            "storage": "50Gi"
          }
        }
      }
    }
  ]
}
```

## Deploying an App

1. Run `k8s-clone` to start the CLI
2. Select **"Apps (Deploy Configured Applications)"** from the main menu
3. Choose the app you want to deploy
4. Select the destination cluster context
5. Select the destination namespace
6. Review the summary and confirm deployment

The tool will automatically:
- Fetch all resources from the source cluster
- Apply any `overwrite-spec` configurations
- Migrate resources in the correct dependency order (ConfigMaps → Secrets → Services → Deployments → PVCs)
- Handle PVC data migration if needed

## Troubleshooting

### "No apps configured" message

**Cause**: The `apps` array in your config file is empty or missing.

**Solution**: Add at least one app definition to your configuration file.

### App not appearing in the menu

**Cause**: Configuration file might have a JSON syntax error or is not being loaded.

**Solution**: 
1. Validate your JSON syntax using a JSON validator
2. Check the config file path (use `K8S_CLONE_CONFIG` env var if using a custom path)
3. Ensure the app has a unique `name`

### Resource not found error

**Cause**: The resource specified in your app definition doesn't exist in the source namespace.

**Solution**:
1. Verify the resource name is correct
2. Check that the resource exists in the specified context and namespace
3. Run `kubectl get <resource-type> -n <namespace> --context <context>` to list available resources

### overwrite-spec not working

**Cause**: The property path might be incorrect or the resource type doesn't support the field.

**Solution**:
1. Verify the property path matches the Kubernetes resource spec structure
2. Use `kubectl get <resource-type> <name> -n <namespace> -o yaml` to see the current spec structure
3. Ensure you're modifying fields within the `spec` section

### Source and destination cannot be the same

**Cause**: You selected the same context and namespace for both source and destination.

**Solution**: Choose a different destination context or namespace. The tool prevents deploying to the same location to avoid accidental overwrites.

## Error Handling

The Custom Apps feature includes built-in error handling:

- **Invalid Configuration**: The tool will warn you if the config file cannot be parsed
- **Missing Resources**: Resources that don't exist in the source are skipped with an error message
- **Already Exists**: If a resource already exists in the destination, it's skipped
- **Validation**: The app will validate that source and destination are different

## Best Practices

1. **Use Descriptive Names**: Choose clear, descriptive names for your apps (e.g., "production-api", "staging-frontend")
2. **Test First**: Always test app deployments in a non-production environment first
3. **Version Control**: Keep your k8s-clone config file in version control
4. **Document overwrite-spec**: Add comments (outside JSON) documenting why specific overrides are needed
5. **Start Simple**: Begin with simple apps (few resources, no overwrite-spec) and gradually add complexity
6. **Review Changes**: Always review the deployment summary before confirming

## Example Configuration File

Here's a complete example showing multiple apps with various configurations:

```json
{
  "clusters": [
    {"name": "dev"},
    {"name": "staging"},
    {"name": "production"}
  ],
  "namespaces": {
    "dev": [{"name": "development"}],
    "staging": [{"name": "staging"}],
    "production": [{"name": "prod"}]
  },
  "apps": [
    {
      "name": "web-app-dev",
      "context": "dev",
      "namespaces": "development",
      "services": [
        {"resource": "web-frontend"},
        {"resource": "web-backend"}
      ],
      "deployments": [
        {
          "resource": "frontend-deployment",
          "overwrite-spec": {
            "replicas": 1
          }
        },
        {
          "resource": "backend-deployment",
          "overwrite-spec": {
            "replicas": 1
          }
        }
      ],
      "configMaps": [
        {"resource": "app-config"}
      ],
      "secrets": [
        {"resource": "api-keys"}
      ]
    },
    {
      "name": "web-app-production",
      "context": "staging",
      "namespaces": "staging",
      "services": [
        {"resource": "web-frontend"},
        {"resource": "web-backend"}
      ],
      "deployments": [
        {
          "resource": "frontend-deployment",
          "overwrite-spec": {
            "replicas": 5
          }
        },
        {
          "resource": "backend-deployment",
          "overwrite-spec": {
            "replicas": 3
          }
        }
      ],
      "configMaps": [
        {"resource": "app-config"}
      ],
      "secrets": [
        {"resource": "api-keys"}
      ],
      "persistentVolumeClaims": [
        {
          "resource": "backend-storage",
          "overwrite-spec": {
            "resources": {
              "requests": {
                "storage": "100Gi"
              }
            }
          }
        }
      ]
    }
  ]
}
```

## Further Reading

- [Main README](README.md) - General k8s-clone documentation
- [Demo Guide](DEMO.md) - Step-by-step usage examples
- [Contributing Guide](CONTRIBUTING.md) - How to contribute to the project
