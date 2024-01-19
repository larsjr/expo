import arg from 'arg';
import path from 'path';

export interface Options {
  exportPath?: string;
  buildPath?: string;
  platform: string;
}

export interface ValidatedOptions {
  exportPath: string;
  buildPath: string;
  platform: string;
}

export const defaultOptions = {
  exportPath: './dist',
  buildPath: '.',
  platform: 'ios',
};

export function resolveOptions(projectRoot: string, args: arg.Result<arg.Spec>): ValidatedOptions {
  return {
    exportPath: path.resolve(projectRoot, args['--export-path'] ?? defaultOptions.exportPath),
    buildPath: path.resolve(projectRoot, args['--build-path'] ?? defaultOptions.buildPath),
    platform: args['--platform'] ?? 'ios',
  };
}
