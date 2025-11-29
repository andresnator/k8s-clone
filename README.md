# K8s Migrator

Una herramienta CLI para clonar y migrar recursos de Kubernetes entre namespaces.

## Características

- Selección granular de recursos (Services, Deployments, ConfigMaps, Secrets, PVCs).
- Migración de datos de PVCs (copia de contenido de volúmenes).
- Interfaz interactiva y amigable.

## Requisitos

- Node.js
- `kubectl` instalado y configurado en el PATH.
- Acceso al clúster de Kubernetes (contexto actual en `~/.kube/config`).

## Instalación

```bash
npm install
npm run build
```

## Uso

```bash
npm start
```

Sigue las instrucciones en pantalla para seleccionar el namespace de origen, el de destino y los recursos a migrar.
