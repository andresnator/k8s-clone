# Release Process Documentation

This document explains the automated release configuration used by k8s-clone. The project uses [semantic-release](https://semantic-release.gitbook.io/) for fully automated versioning and publishing.

## Configuration Overview

The release configuration is defined in `.releaserc.json`. This file specifies which branch triggers releases and which plugins are used.

### Release Branch

```json
"branches": ["main"]
```

Releases are triggered only from the `main` branch. This ensures that only reviewed and approved code gets released.

## Plugin Execution Order

Plugins in `.releaserc.json` execute sequentially:

### 1. `@semantic-release/commit-analyzer`

Analyzes commits to determine release type:
- `fix:` → patch (1.0.0 → 1.0.1)
- `feat:` → minor (1.0.0 → 1.1.0)
- `feat!:` or `BREAKING CHANGE:` → major (1.0.0 → 2.0.0)

### 2. `@semantic-release/release-notes-generator`

Generates release notes from commits, grouped by type.

### 3. `@semantic-release/changelog`

Updates `CHANGELOG.md` with release notes.

### 4. `@semantic-release/npm`

Publishes package to npm (requires `NPM_TOKEN`).

### 5. `@semantic-release/git`

Commits version updates (`package.json`, `package-lock.json`, `CHANGELOG.md`) with `[skip ci]`.

### 6. `@semantic-release/github`

Creates GitHub Release and comments on resolved issues/PRs.

## Release Workflow Diagram

```
Commit to main
       │
       ▼
┌─────────────────────┐
│  commit-analyzer    │ ─── Determine version bump
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│ release-notes-gen   │ ─── Generate release notes
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│     changelog       │ ─── Update CHANGELOG.md
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│        npm          │ ─── Publish to npm registry
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│        git          │ ─── Commit version files
└─────────────────────┘
       │
       ▼
┌─────────────────────┐
│       github        │ ─── Create GitHub Release
└─────────────────────┘
```

## Required Secrets

The GitHub Actions workflow requires these secrets:

| Secret | Description |
|--------|-------------|
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions. Used for creating releases and commenting on issues. |
| `NPM_TOKEN` | npm access token with publish permissions. Required for npm publishing. |

## Triggering a Release

Releases happen automatically when commits are pushed to `main`. To trigger a release:

1. Create commits following [Conventional Commits](https://www.conventionalcommits.org/) format
2. Merge your pull request to `main`
3. The CI workflow analyzes commits and creates a release if applicable

**Note:** Commits that don't follow the conventional format (or use types like `docs:`, `chore:`, `ci:`) won't trigger a release.

## Related Files

- `.releaserc.json` - Semantic-release configuration
- `.github/workflows/publish.yml` - Release workflow
- `CONTRIBUTING.md` - Commit message guidelines

## Troubleshooting

**No release created**: Ensure commits follow Conventional Commits format with release-triggering types.

**npm publish failed**: Verify `NPM_TOKEN` secret and permissions.

**Version conflicts**: Let semantic-release manage versioning—don't manually edit `package.json`.
