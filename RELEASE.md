# Release Process

This project uses [semantic-release](https://semantic-release.gitbook.io/) for automated versioning and publishing.

**Configuration**: `.releaserc.json` defines plugins and release branches (`main` and `develop`).

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

### Production Release (main branch)
1. Use [Conventional Commits](https://www.conventionalcommits.org/) format
2. Merge PR to `main` (from `develop` for regular releases, or directly to `main` for hotfixes)
3. CI automatically creates release if applicable

### Release Candidate (develop branch)
1. Use [Conventional Commits](https://www.conventionalcommits.org/) format
2. Merge PR to `develop`
3. CI automatically creates release candidate if applicable

**Note**: Only `fix:`, `feat:`, and breaking changes trigger releases. Types like `docs:`, `chore:`, `ci:` do not.

## Branching Strategy

- **`main`**: Production releases (e.g., `1.2.0`, `1.2.1`)
- **`develop`**: Release candidates (e.g., `1.3.0-rc.1`, `1.3.0-rc.2`)

### Creating a Fix Release from develop to main

When you need to create a release from develop to main:

1. **Ensure all changes in develop use proper commit format**:
   ```bash
   # Example fix commit
   fix: resolve backup file permissions issue
   
   # Or with scope
   fix(backup): handle special characters in filenames
   ```

2. **Create a PR from develop to main**:
   - The PR should include all commits from develop that aren't in main
   - Review the changes carefully before merging

3. **Merge the PR to main**:
   - Once merged, the Release workflow automatically triggers
   - semantic-release analyzes all commits since the last `main` release and determines the next version
   - If all new release-triggering commits are `fix:`, you'll get a patch release (e.g., `1.2.0` → `1.2.1`)
   - If `develop` has already introduced `feat:` or breaking changes (e.g., `1.3.0-rc.1` on `develop`), semantic-release will create the corresponding minor/major release. For example, `1.2.0` → `1.3.0` instead of a patch release.

4. **Verify the release**:
   - Check GitHub Releases for the new version
   - Verify npm package is published
   - Confirm CHANGELOG.md is updated

## Related Files

- `.releaserc.json`: Release configuration
- `.github/workflows/publish.yml`: CI workflow
- `CONTRIBUTING.md`: Commit guidelines

## Troubleshooting

**No Release**: Verify commits use Conventional Commits format and include release-triggering types  
**npm Publish Failed**: Check `NPM_TOKEN` secret and permissions  
**Version Conflicts**: Never manually edit version in `package.json` - let semantic-release handle it
