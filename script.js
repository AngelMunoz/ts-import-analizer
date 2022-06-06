import { opendir, readlink, realpath, writeFile } from 'fs/promises';
import { resolve, sep } from 'path';
import { parseFile } from '@swc/core';

const isVerbose = process.argv.includes('--verbose');
const includeTests = process.argv.includes('--include-tests');
const useAbsolutePaths = process.argv.includes('--use-absolute-paths');
/**
 *
 * @param {string} filepath
 * @param {string} rootPath
 * @returns {Promise<import("./types").FileLeaf>}
 */
async function getFileWithDependencies(filepath, rootPath) {
  if (isVerbose) console.log('Parsing: ', filepath);
  const parsed = await parseFile(filepath, {
    syntax: 'typescript',
    decorators: true
  });
  const imports = /** @type {import('@swc/core').ImportDeclaration[]} */ (
    /** @type {import('@swc/core').ModuleDeclaration[]} */ parsed.body
  ).filter(b => b.type === 'ImportDeclaration');
  const dependencies = imports.map(i => i.source.value);
  if (isVerbose) {
    console.log('Found:');
    console.dir(dependencies);
  }
  const name = useAbsolutePaths ? filepath : filepath.replace(rootPath, '');
  return {
    name,
    dependencies
  };
}

/**
 *
 * @param {string} path
 * @param {string} rootPath
 * @returns {Promise<import("./types").DirectoryTree>}
 */
async function getDependencyTree(path, rootPath) {
  const dir = await opendir(path);
  const directories = [];
  const files = [];
  for await (const result of dir) {
    const dirpath = resolve(`${path}/${result.name}`);
    if (isVerbose) console.log('Checking: ', dirpath);
    if (result.isDirectory()) {
      if (isVerbose) console.log('Walking into directory');
      directories.push(await getDependencyTree(dirpath, rootPath));
    } else {
      const isTypescript = dirpath.includes('.ts');
      if (!isTypescript) continue;
      const isTest =
        dirpath.includes('.spec.ts') || dirpath.includes('.test.ts');
      if (!includeTests && isTest) continue;
      if (isVerbose) console.log('Getting Dependencies');
      files.push(await getFileWithDependencies(dirpath, rootPath));
    }
  }
  const fpath = useAbsolutePaths ? path : path.replace(rootPath, '');
  return {
    path: fpath,
    files,
    directories
  };
}

/**
 *
 * @param  {...string} args
 */
async function main(...args) {
  const pathArg = args.indexOf('--path');
  if (pathArg + 1 >= args.length) {
    console.error('Missing: --path <PATH TO DIRECTORY>');
    process.exit(1);
  }
  let path = args[pathArg + 1];
  if (!path) {
    console.error('Missing: --path <PATH TO DIRECTORY>');
    process.exit(1);
  }

  path = resolve(path);
  const rootPath = resolve(path, '../');

  if (isVerbose) console.log('Getting Dependencies');

  const hierarchy = await getDependencyTree(path, rootPath);

  if (isVerbose) {
    console.log('Formed Tree:');
    console.dir(hierarchy, { depth: 100 });
  }

  console.log('Writing to file hierarchy.json');
  await writeFile('./hierarchy.json', JSON.stringify(hierarchy, null, 2));
}

main(...process.argv.slice(2)).catch(err => {
  if (isVerbose) {
    console.error(err);
  } else {
    console.error('Failed to walk dependency tree:', err.message);
  }
  process.exit(1);
});
