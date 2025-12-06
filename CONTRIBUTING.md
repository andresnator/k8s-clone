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

This project uses [semantic-release](https://semantic-release.gitbook.io/) for automated versioning and npm publishing. No manual version bumping is required. See [RELEASE.md](./RELEASE.md) for details.

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

- **`main`**: Production-ready branch. Only accepts PRs from `develop` or `hotfix/*`.
- **`develop`**: Integration branch for new features and non-critical fixes.
- **`hotfix/*`**: Critical production fixes that merge directly to `main`.
## Pull Request Process

1. Create a feature branch from `develop` (or `hotfix/*` from `main` for critical fixes)
2. Make changes following coding standards
3. Write/update tests
4. Ensure tests pass: `npm test`
5. Commit using Conventional Commits format
6. Push and create a PR (features → `develop`, hotfixes → `main`)
7. Wait for CI checks and request review

## Coding Standards

- Use TypeScript for all source files
- Follow existing code style and patterns
- Use the `K8sClient` class for Kubernetes API interactions
- Handle errors gracefully with user-friendly messages
- Add JSDoc comments for public APIs

## Testing

Write unit tests in the `tests/` directory. Run `npm test` before submitting PRs.

## Questions?

If you have questions, feel free to:
- Open an [issue](https://github.com/andresnator/k8s-clone/issues)
- Start a [discussion](https://github.com/andresnator/k8s-clone/discussions)

Thank you for contributing! 🚀
