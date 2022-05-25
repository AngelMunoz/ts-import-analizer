import { opendir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { parseFile } from '@swc/core';

const isVerbose = process.argv.includes('--verbose');
/**
 *
 * @param {string} filepath
 * @returns {Promise<import("./types").FileLeaf>}
 */
async function getFileWithDependencies(filepath) {
  if (isVerbose) console.log('Parsing: ', filepath);
  const parsed = await parseFile(filepath, { syntax: 'typescript' });
  const imports = /** @type {import('@swc/core').ImportDeclaration[]} */ (
    /** @type {import('@swc/core').ModuleDeclaration[]} */ parsed.body
  ).filter(b => b.type === 'ImportDeclaration');
  const dependencies = imports.map(i => i.source.value);
  if (isVerbose) {
    console.log('Found:');
    console.dir(dependencies);
  }
  return { name: filepath, dependencies };
}

/**
 *
 * @param {string} path
 * @returns {Promise<import("./types").DirectoryTree>}
 */
async function getDependencyTree(path) {
  const dir = await opendir(path);
  let result = await dir.read();
  const directories = [];
  const files = [];
  while (result) {
    const dirpath = resolve(`${path}/${result.name}`);
    if (isVerbose) console.log('Checking: ', dirpath);
    if (result.isDirectory()) {
      if (isVerbose) console.log('Walking into directory');
      directories.push(await getDependencyTree(dirpath));
    } else {
      if (isVerbose) console.log('Getting Dependencies');
      files.push(await getFileWithDependencies(dirpath));
    }
    result = await dir.read();
  }
  return { path, files, directories };
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

  if (isVerbose) console.log('Getting Dependencies');

  const hierarchy = await getDependencyTree(path);

  if (isVerbose) {
    console.log('Formed Tree:');
    console.dir(hierarchy, { depth: 100 });
  }

  console.log('Writing to file hierarchy.json');
  await writeFile('./hierarchy.json', JSON.stringify(hierarchy, null, 2));
}

main(...process.argv.slice(2)).catch(err => {
  if (process.argv.includes('--verbose')) {
    console.error(err);
  } else {
    console.error('Failed to walk dependency tree:', err.message);
  }
  process.exit(1);
});
