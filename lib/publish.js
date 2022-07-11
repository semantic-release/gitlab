const {createReadStream} = require('fs');
const pathlib = require('path');
const {stat} = require('fs-extra');
const {isPlainObject, template} = require('lodash');
const FormData = require('form-data');
const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');
const getAssets = require('./glob-assets');
const {RELEASE_NAME} = require('./definitions/constants');

module.exports = async (pluginConfig, context) => {
  const {
    cwd,
    options: {repositoryUrl},
    nextRelease: {gitTag, gitHead, notes},
    logger,
  } = context;
  const {gitlabToken, gitlabUrl, gitlabApiUrl, assets, milestones, proxy} = resolveConfig(pluginConfig, context);
  const assetsList = [];
  const repoId = getRepoId(context, gitlabUrl, repositoryUrl);
  const encodedRepoId = encodeURIComponent(repoId);
  const encodedGitTag = encodeURIComponent(gitTag);
  const apiOptions = {headers: {'PRIVATE-TOKEN': gitlabToken}};

  debug('repoId: %o', repoId);
  debug('release name: %o', gitTag);
  debug('release ref: %o', gitHead);
  debug('milestones: %o', milestones);

  if (assets && assets.length > 0) {
    // Skip glob if url is provided
    const urlAssets = assets.filter((asset) => asset.url);
    debug('url assets: %o', urlAssets);
    const globbedAssets = await getAssets(
      context,
      assets.filter((asset) => !asset.url)
    );
    debug('globbed assets: %o', globbedAssets);
    const allAssets = [...urlAssets, ...globbedAssets];
    debug('all assets: %o', allAssets);

    await Promise.all(
      allAssets.map(async (asset) => {
        const {path} = isPlainObject(asset) ? asset : {path: asset};
        const _url = asset.url ? template(asset.url)(context) : undefined;
        const label = asset.label ? template(asset.label)(context) : undefined;
        const type = asset.type ? template(asset.type)(context) : undefined;
        const filepath = asset.filepath ? template(asset.filepath)(context) : undefined;
        if (_url) {
          assetsList.push({label, rawUrl: _url, type, filepath});
          debug('use link from release setting: %s', _url);
        } else {
          const file = pathlib.resolve(cwd, path);

          let fileStat;

          try {
            fileStat = await stat(file);
          } catch {
            logger.error('The asset %s cannot be read, and will be ignored.', path);
            return;
          }

          if (!fileStat || !fileStat.isFile()) {
            logger.error('The asset %s is not a file, and will be ignored.', path);
            return;
          }

          debug('file path: %o', path);
          debug('file label: %o', label);
          debug('file type: %o', type);
          debug('file filepath: %o', filepath);

          // Uploaded assets to the project
          const form = new FormData();
          form.append('file', createReadStream(file));

          const uploadEndpoint = urlJoin(gitlabApiUrl, `/projects/${encodedRepoId}/uploads`);

          debug('POST-ing the file %s to %s', file, uploadEndpoint);

          let response;
          try {
            response = await got.post(uploadEndpoint, {...apiOptions, ...proxy, body: form}).json();
          } catch (error) {
            logger.error('An error occurred while uploading %s to the GitLab project uploads API:\n%O', file, error);
            throw error;
          }

          const {url, alt} = response;

          assetsList.push({label, alt, url, type, filepath});

          logger.log('Uploaded file: %s', url);
        }
      })
    );
  }

  debug('Create a release for git tag %o with commit %o', gitTag, gitHead);

  const createReleaseEndpoint = urlJoin(gitlabApiUrl, `/projects/${encodedRepoId}/releases`);

  const json = {
    /* eslint-disable camelcase */
    tag_name: gitTag,
    description: notes && notes.trim() ? notes : gitTag,
    milestones,
    assets: {
      links: assetsList.map(({label, alt, url, type, filepath, rawUrl}) => {
        return {
          name: label || alt,
          url: rawUrl || urlJoin(gitlabUrl, repoId, url),
          link_type: type,
          filepath,
        };
      }),
    },
    /* eslint-enable camelcase */
  };

  debug('POST-ing the following JSON to %s:\n%s', createReleaseEndpoint, JSON.stringify(json, null, 2));

  try {
    await got.post(createReleaseEndpoint, {
      ...apiOptions,
      ...proxy,
      json,
    });
  } catch (error) {
    logger.error('An error occurred while making a request to the GitLab release API:\n%O', error);
    throw error;
  }

  logger.log('Published GitLab release: %s', gitTag);

  const releaseUrl = urlJoin(gitlabUrl, repoId, `/-/releases/${encodedGitTag}`);

  return {name: RELEASE_NAME, url: releaseUrl};
};
