# Contributing to k8s-clone

Thank you for your interest in contributing to k8s-clone! This document provides guidelines and information for contributors.

## Development Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/andresnator/k8s-clone.git
   cd k8s-clone
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the project:**
   ```bash
   npm run build
   ```

4. **Run tests:**
   ```bash
   npm test
   ```

## Project Structure

```
src/
├── index.ts           # CLI entry point
├── migrator.ts        # Core migration logic
├── cleaner.ts         # Resource cleanup logic
├── k8s.ts             # Kubernetes API client wrapper
├── ui.ts              # Interactive UI components
├── config.ts          # Configuration management
├── metadata-cleaner.ts # Metadata cleaning utilities
├── resource-handlers.ts # Resource-specific handling
├── types.ts           # TypeScript type definitions
└── Banner.tsx         # Banner component
```

## Automated Releases

This project uses [semantic-release](https://semantic-release.gitbook.io/) for fully automated versioning and npm publishing. When commits are pushed to `main`, the CI pipeline will:

1. Analyze commit messages
2. Determine the next version number
3. Generate release notes and CHANGELOG
4. Publish to npm
5. Create a GitHub Release

**No manual version bumping is required.**

For detailed documentation on the release configuration, including plugin order and configuration details, see [RELEASE.md](./RELEASE.md).

## Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification. This enables automatic versioning based on commit history.

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types and Version Bumps

| Type | Description | Version Bump |
|------|-------------|--------------|
| `fix` | Bug fixes | **Patch** (1.0.0 → 1.0.1) |
| `feat` | New features | **Minor** (1.0.0 → 1.1.0) |
| `feat!` | Breaking changes | **Major** (1.0.0 → 2.0.0) |
| `docs` | Documentation changes | No version bump |
| `style` | Code style changes (formatting) | No version bump |
| `refactor` | Code refactoring | No version bump |
| `perf` | Performance improvements | No version bump |
| `test` | Adding or updating tests | No version bump |
| `chore` | Maintenance tasks | No version bump |
| `ci` | CI/CD changes | No version bump |

### Examples

```bash
# Patch release (bug fix)
git commit -m "fix: resolve PVC data migration timeout issue"

# Minor release (new feature)
git commit -m "feat: add support for StatefulSet migration"

# Major release (breaking change)
git commit -m "feat!: change CLI argument format"

# With scope
git commit -m "fix(migrator): handle empty namespace gracefully"

# With body
git commit -m "feat: add dry-run mode

This adds a --dry-run flag that shows what would be migrated
without actually performing the migration."

# Breaking change with footer
git commit -m "feat: redesign resource selection

BREAKING CHANGE: The --resources flag now uses comma-separated values
instead of multiple flag instances."
```

## Branching Strategy

We follow a strict branching model to ensure stability in our production releases.

- **`main`**: The production-ready branch. **Direct commits are not allowed.** This branch only accepts Pull Requests from `develop` or `hotfix/*` branches.
- **`develop`**: The integration branch for new features and non-critical fixes. All feature branches should target this branch.
- **`hotfix/*`**: Branches reserved for critical production fixes that need to be merged directly into `main`.

> **Note:** Changes from `develop` are merged into `main` as part of the release process. This typically occurs after all features and fixes have been tested and approved, and at the discretion of the maintainers. If you are waiting for your changes to be released to production, please monitor the repository or ask a maintainer about the next scheduled release.
## Pull Request Process

1. **Create a feature branch:**
   Always create your branch from `develop` (unless it's a hotfix).
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feat/my-new-feature
   ```

2. **Make your changes** following the coding standards

3. **Write/update tests** for your changes

4. **Ensure all tests pass:**
   ```bash
   npm test
   ```

5. **Commit using Conventional Commits format**

6. **Push and create a Pull Request**
   - For **features**: Target the `develop` branch.
   - For **hotfixes**: Target the `main` branch (branch name must start with `hotfix/`).

   > **Important:** The `main` branch has a protection rule that rejects PRs from branches other than `develop` or `hotfix/*`.

7. **Wait for CI checks** to pass

8. **Request review** from maintainers

## Coding Standards

- Use TypeScript for all source files
- Follow existing code style and patterns
- Use the `K8sClient` class for Kubernetes API interactions
- Handle errors gracefully with user-friendly messages
- Add JSDoc comments for public APIs

## Testing

- Write unit tests for new functionality
- Place tests in the `tests/` directory
- Use descriptive test names
- Run tests before submitting PRs:
  ```bash
  npm test
  npm run test:coverage
  ```

## Questions?

If you have questions, feel free to:
- Open an [issue](https://github.com/andresnator/k8s-clone/issues)
- Start a [discussion](https://github.com/andresnator/k8s-clone/discussions)

Thank you for contributing! 🚀
