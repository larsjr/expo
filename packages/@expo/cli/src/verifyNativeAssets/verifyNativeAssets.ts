import fs from 'fs';
import glob from 'glob';
import path from 'path';

import { CommandError } from '../utils/errors';

const debug = require('debug')('expo:verify-native-assets') as typeof console.log;

export function getMissingAssets(
  buildPath: string,
  exportPath: string,
  platform: string,
  projectRoot: string
) {
  const buildManifestAssetSet = getBuildManifestAssetSet(buildPath, platform, projectRoot);
  const fullAssetMap = getFullAssetMap(exportPath);
  const fullAssetSet = getFullAssetSet(fullAssetMap);
  const exportedAssetSet = getExportedAssetSet(exportPath, platform);

  debug(`Assets in build: ${JSON.stringify([...buildManifestAssetSet], null, 2)}`);
  debug(`Assets in exported bundle: ${JSON.stringify([...exportedAssetSet], null, 2)}`);
  debug(`All assets resolved by Metro: ${JSON.stringify([...fullAssetSet], null, 2)}`);

  const buildAssetsPlusExportedAssets = new Set(buildManifestAssetSet);
  exportedAssetSet.forEach((hash) => buildAssetsPlusExportedAssets.add(hash));

  const missingAssets: {
    hash: string;
    path: string;
  }[] = [];

  fullAssetSet.forEach((hash) => {
    if (!buildAssetsPlusExportedAssets.has(hash)) {
      const asset = fullAssetMap[hash];
      console.warn(`  Missing asset: hash = ${hash}, file = ${asset.files[0]}`);
      missingAssets.push({
        hash,
        path: asset.files[0],
      });
    }
  });

  return missingAssets;
}

export function getBuildManifestAssetSet(buildPath: string, platform: string, projectRoot: string) {
  let realBuildPath = buildPath;
  if (buildPath === projectRoot) {
    switch (platform) {
      case 'android':
        realBuildPath = path.resolve(projectRoot, 'android', 'app', 'build');
        break;
      default:
        realBuildPath = path.resolve(projectRoot, 'ios', 'build');
        break;
    }
    realBuildPath = path.resolve(projectRoot, platform);
  }
  const buildManifestPaths = glob.sync(`${realBuildPath}/**/app.manifest`);
  if (buildManifestPaths.length === 0) {
    throw new CommandError(`No app.manifest found in build path`);
  }
  const buildManifestPath = buildManifestPaths[0];
  debug(`Build manifest found at ${buildManifestPath}`);
  const buildManifestString = fs.readFileSync(buildManifestPaths[0], { encoding: 'utf-8' });
  const buildManifest: { assets: { packagerHash: string }[] } = JSON.parse(buildManifestString);
  return new Set((buildManifest.assets ?? []).map((asset) => asset.packagerHash));
}

export function getFullAssetMap(exportPath: string) {
  const assetMapPath = path.resolve(exportPath, 'assetmap.json');
  if (!fs.existsSync(assetMapPath)) {
    throw new CommandError(
      `The export bundle chosen does not contain assetmap.json. Please generate the bundle with "npx expo export --dump-assetmap"`
    );
  }
  const assetMapString = fs.readFileSync(assetMapPath, { encoding: 'utf-8' });
  const assetMap: { [k: string]: any } = JSON.parse(assetMapString);
  return assetMap;
}

export function getFullAssetSet(assetMap: { [k: string]: any }) {
  const assetSet = new Set<string>();
  for (const hash in assetMap) {
    assetSet.add(hash);
  }
  return assetSet;
}

export function getExportedAssetSet(exportPath: string, platform: string) {
  const metadataPath = path.resolve(exportPath, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    throw new CommandError(
      `The export bundle chosen does not contain metadata.json. Please generate the bundle with "npx expo export --dump-assetmap"`
    );
  }
  const metadataString = fs.readFileSync(metadataPath, { encoding: 'utf-8' });
  const metadata: { [k: string]: any } = JSON.parse(metadataString);
  const assetSet = new Set<string>();
  const assets: { path: string; ext: string }[] = metadata.fileMetadata[platform].assets;
  assets.forEach((asset) => {
    assetSet.add(asset.path.substring(7, asset.path.length));
  });
  return assetSet;
}
