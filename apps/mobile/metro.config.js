const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// 1. Find the project and monorepo workspace root paths
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 2. Watch all files within the monorepo workspace
config.watchFolders = [workspaceRoot];

// 3. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
