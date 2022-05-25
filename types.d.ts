type FileLeaf = {
  name: string;
  dependencies: string[];
};

export type DirectoryTree = {
  path: string;
  files: FileLeaf[];
  directories: DirectoryTree[];
};
