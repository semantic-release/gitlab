const {createReadStream} = require('fs');
const {resolve} = require('path');
const FormData = require('form-data');
const debug = require('debug')('semantic-release:gitlab');
const urlJoin = require('url-join');
const {isPlainObject, isArray, isNil, isString, isEmpty, template} = require('lodash');
const {statSync} = require('fs-extra');
const createGitlabApi = require('./gitlab-api');
const getAssets = require('./glob-assets');
const getRepoId = require('./get-repo-id');
const resolveConfig = require('./resolve-config');

async function resolveAssets(context, assets) {
  const globbedAssets = await getAssets(context, assets);
  debug('globbed assets: %o', globbedAssets);
  return globbedAssets
    .map(asset => {
      const {path, label} = isPlainObject(asset) ? asset : {path: asset};
      const file = resolve(context.cwd, path);
      return {...asset, path, label, file};
    })
    .filter(({file, label, path}) => {
      let fileStat;

      try {
        fileStat = statSync(file);
      } catch (_) {
        context.logger.error('The asset %s cannot be read, and will be ignored.', path);
        return false;
      }

      if (!fileStat || !fileStat.isFile()) {
        context.logger.error('The asset %s is not a file, and will be ignored.', path);
        return false;
      }

      debug('file path: %o', path);
      debug('file label: %o', label);

      return true;
    });
}

function compileAssetTemplates(asset) {
  const options = {interpolate: /{{([\s\S]+?)}}/g};
  return {
    ...asset,
    // Expand name and url using `{{ }}` as delimiter
    name: isNil(asset.name) && isNil(asset.label) ? undefined : template(asset.name || asset.label, options),
    url: template(asset.url, options),
  };
}

async function extractAssets(context, assets) {
  const emptyAssets = isEmpty(assets);
  const fileAssets = emptyAssets
    ? []
    : await resolveAssets(
        context,
        assets.filter(asset => isString(asset) || isArray(asset) || !isNil(asset.path))
      );

  const urlAssets = emptyAssets
    ? []
    : assets
        .filter(asset => !isNil(asset.url))
        .map(asset => compileAssetTemplates(asset))
        .map(asset => {
          const url = asset.url(context);
          return {
            ...asset,
            // Default `name` to the actual `url` if missing
            name: asset.name ? asset.name(context) : url,
            url,
          };
        });

  return {urlAssets, fileAssets};
}

async function publish(pluginConfig, context) {
  const {
    options: {repositoryUrl},
    nextRelease: {gitTag, gitHead, notes},
    logger,
  } = context;
  const {gitlabUrl, assets, gitlabApiUrl, gitlabToken} = resolveConfig(pluginConfig, context);
  const repoId = getRepoId(context, gitlabUrl, repositoryUrl);

  debug('repoId: %o', repoId);
  debug('release name: %o', gitTag);
  debug('release ref: %o', gitHead);

  const {release, links, uploads, tagUrl} = createGitlabApi(gitlabApiUrl, {token: gitlabToken});

  debug('Update git tag %o with commit %o and release description', gitTag, gitHead);
  await release(repoId, gitTag, notes);

  const {urlAssets, fileAssets} = await extractAssets(context, assets);

  // Add all assets declaring a `url` property (may be a lodash template)
  if (!isEmpty(urlAssets)) {
    await Promise.all(
      urlAssets.map(async asset => {
        await links(repoId, gitTag, asset);
        logger.log('Added link to asset %s (%s)', asset.url, asset.name);
      })
    );
  }

  // Upload and add all file assets declaring a `path` property (globbed paths are expanded)
  if (!isEmpty(fileAssets)) {
    await Promise.all(
      fileAssets.map(async ({file, label}) => {
        // Uploaded assets to the project
        const form = new FormData();
        form.append('file', createReadStream(file));

        const {url, alt} = await uploads(repoId, form);
        logger.log('Uploaded file: %s', url);

        await links(repoId, gitTag, {name: label || alt, url: urlJoin(gitlabUrl, repoId, url)});
        debug('Added link to asset %o', url);
      })
    );
  }

  logger.log('Published GitLab release: %s', gitTag);

  return {url: tagUrl(gitlabUrl, repoId, gitTag), name: 'GitLab release'};
}

module.exports = publish;
