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

The plugins in `.releaserc.json` execute in a specific order, where each plugin depends on the previous steps. The order is crucial for a proper release workflow:

### 1. `@semantic-release/commit-analyzer`

**Purpose:** Analyzes commit messages to determine the type of release.

- Parses commits since the last release using [Conventional Commits](https://www.conventionalcommits.org/) format
- Determines if a release is needed and what type (major, minor, patch)
- Uses the Angular preset by default:
  - `fix:` commits trigger a **patch** release (1.0.0 → 1.0.1)
  - `feat:` commits trigger a **minor** release (1.0.0 → 1.1.0)
  - `feat!:` or `BREAKING CHANGE:` triggers a **major** release (1.0.0 → 2.0.0)

### 2. `@semantic-release/release-notes-generator`

**Purpose:** Generates release notes from the analyzed commits.

- Creates human-readable release notes from commit messages
- Groups commits by type (Features, Bug Fixes, etc.)
- Includes links to commits and pull requests
- These notes appear in GitHub Releases and the CHANGELOG

### 3. `@semantic-release/changelog`

**Purpose:** Updates the CHANGELOG.md file.

- Prepends release notes to `CHANGELOG.md`
- Maintains a historical record of all releases
- The file is committed as part of the release (see step 5)

### 4. `@semantic-release/npm`

**Purpose:** Publishes the package to npm.

- Updates `version` in `package.json` and `package-lock.json`
- Publishes the package to the npm registry
- Requires `NPM_TOKEN` secret to be configured
- Uses npm provenance for package integrity (configured in workflow)

### 5. `@semantic-release/git`

**Purpose:** Commits release artifacts back to the repository.

```json
{
    "assets": [
        "package.json",
        "package-lock.json",
        "CHANGELOG.md"
    ],
    "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
}
```

- **assets:** Files to commit after the release
  - `package.json` and `package-lock.json` contain the updated version
  - `CHANGELOG.md` contains the new release notes
- **message:** The commit message format
  - Uses `chore(release):` prefix for consistency
  - Includes `[skip ci]` to prevent infinite release loops
  - Includes release notes in the commit body

### 6. `@semantic-release/github`

**Purpose:** Creates GitHub Releases and manages GitHub integration.

- Creates a GitHub Release with the version tag
- Attaches release notes to the GitHub Release
- Comments on resolved issues and pull requests
- Adds labels to released issues/PRs

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

## Triggering a Release

Releases happen automatically when changes are merged into `main`. Due to branch protection rules, **you cannot push directly to main**.

The standard flow is:
1. Create a feature branch from `develop`.
2. Merge your feature branch into `develop` via Pull Request.
3. When ready for a release, create a Pull Request from `develop` to `main`.
4. Once merged, the CI workflow analyzes the new commits on `main` and creates a release if applicable.

**Hotfixes:**
- For critical bugs, create a branch `hotfix/xxx` from `main`.
- Fix the bug and PR directly back to `main`.

**Note:** Commits that don't follow the conventional format (or use types like `docs:`, `chore:`, `ci:`) won't trigger a release.

## Related Files

- `.releaserc.json` - Semantic-release configuration
- `.github/workflows/publish.yml` - Release workflow
- `CONTRIBUTING.md` - Commit message guidelines

## Troubleshooting

### No Release Created

If no release is created after merging:
- Ensure commits follow Conventional Commits format
- Check that at least one commit has a release-triggering type (`fix:`, `feat:`, etc.)
- Verify the workflow ran successfully in GitHub Actions

### npm Publish Failed

If npm publishing fails:
- Verify `NPM_TOKEN` secret is set correctly
- Ensure the token has publish permissions
- Check if the package name is available/owned

### Version Conflicts

If there are version conflicts:
- Don't manually edit `version` in `package.json`
- Let semantic-release manage versioning automatically
- Resolve conflicts by accepting the current main branch version
