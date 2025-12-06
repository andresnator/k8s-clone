# Release Process

This project uses [semantic-release](https://semantic-release.gitbook.io/) for automated versioning and publishing.

**Configuration**: `.releaserc.json` defines plugins and release branch (`main` only).

## Plugin Order

Plugins execute sequentially:

1. **commit-analyzer**: Determines release type from [Conventional Commits](https://www.conventionalcommits.org/)
   - `fix:` → patch (1.0.0 → 1.0.1)
   - `feat:` → minor (1.0.0 → 1.1.0)
   - `feat!:` or `BREAKING CHANGE:` → major (1.0.0 → 2.0.0)

2. **release-notes-generator**: Creates release notes grouped by type

3. **changelog**: Generates CHANGELOG.md with release notes

4. **npm**: Publishes to npm registry (requires `NPM_TOKEN`)

5. **github**: Creates GitHub Release with notes, tags, and attaches CHANGELOG.md

## Workflow

Commit to `main` → Analyze commits → Generate notes → Generate CHANGELOG → Publish to npm → Create GitHub Release

**Note**: The CHANGELOG.md file is generated during the release process and attached to GitHub releases, but is not committed back to the repository. This approach complies with branch protection rules that prevent direct pushes to main.

## Required Secrets

- `GITHUB_TOKEN`: Auto-provided by GitHub Actions
- `NPM_TOKEN`: npm access token for publishing

## Triggering a Release

1. Use [Conventional Commits](https://www.conventionalcommits.org/) format
2. Merge PR to `main`
3. CI automatically creates release if applicable

**Note**: Only `fix:`, `feat:`, and breaking changes trigger releases. Types like `docs:`, `chore:`, `ci:` do not.

## Related Files

- `.releaserc.json`: Release configuration
- `.github/workflows/publish.yml`: CI workflow
- `CONTRIBUTING.md`: Commit guidelines

## Troubleshooting

**No Release**: Verify commits use Conventional Commits format and include release-triggering types  
**npm Publish Failed**: Check `NPM_TOKEN` secret and permissions  
**Version Conflicts**: Never manually edit version in `package.json` - let semantic-release handle it
