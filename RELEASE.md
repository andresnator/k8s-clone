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

3. **changelog**: Updates CHANGELOG.md with release notes

4. **npm**: Publishes to npm registry (requires `NPM_TOKEN`)

5. **git**: Commits version files and CHANGELOG.md with `[skip ci]`

6. **github**: Creates GitHub Release with notes and tags

## Workflow

Commit to `main` → Analyze commits → Generate notes → Update CHANGELOG → Publish to npm → Commit files → Create GitHub Release

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
