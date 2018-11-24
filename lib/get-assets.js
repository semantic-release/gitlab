const path = require('path');
const {isPlainObject, castArray, uniqWith, uniq} = require('lodash');
const dirGlob = require('dir-glob');
const globby = require('globby');
const debug = require('debug')('semantic-release:github');

/**
 * Transform file path and if the files is ignored return a empty path
 *
 * @param {Array} files The list of assets to transform
 * @param {String} cwd The asset context
 * @param {Function} transform The path transform
 *
 * @return {Array} the assets parsed
 */
const filesTransform = (files, cwd, transform) => {
  return files.reduce((result, file) => {
    if (typeof file === 'string') {
      result.push(`${file.startsWith('!') ? '!' : ''}${transform(cwd, file.startsWith('!') ? file.slice(1) : file)}`);
    }
    return result;
  }, []);
};

/**
 * Get the asset path
 *
 * @param {(String|Object)} asset The asset definition
 *
 * @return {String} the assets path definition
 */
const getAssetPath = asset => {
  return isPlainObject(asset) ? asset.path : asset;
};

/**
 * Get assets by pattern, directory or path, can be a glob or and Array of globs and Objects.
 *
 * @param {String} cwd The context path.
 * @param {Array} assets The assets list.
 * Allow the following properties:
 * path - Required. A glob to identify the files to upload.
 * label- Short description of the file
 *
 * @return {Array} the assets list with full path or a original definition if a files is missing
 */
const getGlogAssets = async (cwd, assets) => {
  const results = await Promise.all(
    assets.map(async asset => {
      let files = castArray(getAssetPath(asset));
      const glob = await dirGlob(filesTransform(files, cwd, path.resolve));
      // Remove duplicate files
      files = uniq([...filesTransform(glob, cwd, path.relative), ...files]);

      // Skip negated pattern of is the only one in the group
      if (files.length <= 1 && (!files[0] || files[0].startsWith('!'))) {
        debug('skipping the negated glob %o', files[0]);
        return [];
      }

      const globbed = await globby(files, {
        cwd,
        expandDirectories: true,
        gitignore: false,
        dot: true,
        onlyFiles: false,
      });

      if (globbed.length <= 0) {
        // If no match found, the elements of the glob will be considered as a missing file
        return asset;
      }
      if (!isPlainObject(asset)) {
        return globbed;
      }

      return globbed.map(file => {
        // Output an Object definition with:
        // - `path` of the matched file
        // - `name` actual file name
        // - other properties of the original asset definition
        return {...asset, path: file, name: path.basename(file)};
      });
    })
  );
  return results;
};

module.exports = async ({cwd}, assets) => {
  const glogAssets = await getGlogAssets(cwd, assets);
  return uniqWith(
    [].concat(...glogAssets).sort(asset => (isPlainObject(asset) ? -1 : 1)),
    // Compare `path` property if Object definition, value itself if String
    (a, b) => path.resolve(cwd, getAssetPath(a)) === path.resolve(cwd, getAssetPath(b))
  ).map(asset => (isPlainObject(asset) ? asset : {path: asset, name: path.basename(asset)}));
};
