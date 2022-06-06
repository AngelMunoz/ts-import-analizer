## ts-import-analizer

This basically checks recursively a specified directory looking out for typescript files and getting it's imports to build an import tree

## Run

first run `pnpm install` (or `npm install`) then:

- `pnpm start --path <absolute or relative path to directory>`

### Extra options

- `--verbose` - print extra logs to see what's going on
- `--include-test-files` - include .spec.ts files in the hierarchy
- `--use-absolute-paths` - all of the resolved paths are used in its absolute form, otherwise the paths get rooted to the provided directory. Example below:

The following form can be useful to trace that is the file system layout of these files

```
Include: --path "/home/user/path/to/project" --use-absolute-paths
/home/user/path/to/project/src/content
/home/user/path/to/project/src/content/file.ts
```

The following form is useful to analyze the data and treat these paths as absolute so you can build/resolve dependencies like `../../../my-dependency.ts` also to not expose the current user's path to other consumers on the final result

```
Exclude: --path "/home/user/path/to/project" --use-absolute-paths
/project/src/content
/project/src/content/file.ts
```
