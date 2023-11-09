# Scripts

This directory is a Yarn workspace that contains
[`zx` scripts](https://github.com/google/zx) relevant to the repository.

## Running Scripts

Scripts can be run from within this directory, or, ideally, from within the root
of the repository. See [`../CONTRIBUTING.md`](../CONTRIBUTING.md) for more
details, but tl;dr :

From the root:

```bash
yarn zx scripts/print-cwd.ts
```

From this directory:

```bash
yarn zx print-cwd.ts
```

### Current Working Directory

When running scripts, `process.cwd()` will be the directory of the user calling
the script. This is because the `yarn zx` alias in the root repository is
**not** implemented with `yarn workspace run` (which _would_ change the working
directory to that of the workspace).

For example, try running `yarn zx scripts/print-cwd.ts` (from root), or
`yarn zx print-cwd.ts` (from within `scripts`):

```bash
# From root of repository
❯ yarn zx scripts/print-cwd.ts
[CWD] /path/to/repo/crxmon

# Move to scripts directory and run again
❯ cd scripts/
❯ yarn zx print-cwd.ts
[CWD] /Users/mjr/exp/crxmon/scripts
```

## Writing Scripts

For writing scripts, see the [`zx` readme](https://github.com/google/zx). Note
that certain modules you might normally import from Node are exported from `zx`,
like `chalk`, `fs`, `os`, and `fetch`.
