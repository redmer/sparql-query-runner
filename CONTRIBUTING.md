# Contributions guide

Pull Requests are welcome.

## Don't forget

- Format using Prettier.
- Update README or [Docs/](docs/) with pertinent changes.

## Releases

Releases are automated with [release-please](https://github.com/googleapis/release-please).
Commit messages on `main` must follow [Conventional Commits](https://www.conventionalcommits.org/);
release-please opens a release PR that bumps `package.json`, the manifest and `CHANGELOG`.
Merging that PR pushes a `v*` tag, which triggers `.github/workflows/release.yml` to build,
test, publish to NPM (with provenance) and push the Docker image to GHCR.

This requires a `RELEASE_PLEASE_TOKEN` repository secret (a PAT with `repo` scope), because
tags pushed with the default `GITHUB_TOKEN` do not trigger other workflows.
