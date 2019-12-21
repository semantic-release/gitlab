const {createReadStream} = require('fs');
const {resolve} = require('path');
const {stat} = require('fs-extra');
const {isPlainObject} = require('lodash');
const FormData = require('form-data');
const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');
const getAssets = require('./glob-assets');

module.exports = async (pluginConfig, context) => {
  const {
    cwd,
    options: {repositoryUrl},
    nextRelease: {gitTag, gitHead, notes},
    logger,
  } = context;
  const {gitlabToken, gitlabUrl, gitlabApiUrl, assets} = resolveConfig(pluginConfig, context);
  const assetsList = [];
  const repoId = getRepoId(context, gitlabUrl, repositoryUrl);
  const encodedRepoId = encodeURIComponent(repoId);
  const encodedGitTag = encodeURIComponent(gitTag);
  const apiOptions = {json: true, headers: {'PRIVATE-TOKEN': gitlabToken}};

  debug('repoId: %o', repoId);
  debug('release name: %o', gitTag);
  debug('release ref: %o', gitHead);

  if (assets && assets.length > 0) {
    const globbedAssets = await getAssets(context, assets);
    debug('globbed assets: %o', globbedAssets);

    await Promise.all(
      globbedAssets.map(async asset => {
        const {path, label} = isPlainObject(asset) ? asset : {path: asset};
        const file = resolve(cwd, path);
        let fileStat;

        try {
          fileStat = await stat(file);
        } catch (_) {
          logger.error('The asset %s cannot be read, and will be ignored.', path);
          return;
        }

        if (!fileStat || !fileStat.isFile()) {
          logger.error('The asset %s is not a file, and will be ignored.', path);
          return;
        }

        debug('file path: %o', path);
        debug('file label: %o', label);

        // Uploaded assets to the project
        const form = new FormData();
        form.append('file', createReadStream(file));
        const {body} = await got.post(urlJoin(gitlabApiUrl, `/projects/${encodedRepoId}/uploads`), {
          ...apiOptions,
          json: false,
          body: form,
        });
        const {url, alt} = JSON.parse(body);

        assetsList.push({label, alt, url});

        logger.log('Uploaded file: %s', url);
      })
    );
  }

  debug('Update git tag %o with commit %o and release description', gitTag, gitHead);
  await got.post(urlJoin(gitlabApiUrl, `/projects/${encodedRepoId}/repository/tags/${encodedGitTag}/release`), {
    ...apiOptions,
    body: {tag_name: gitTag, description: notes}, // eslint-disable-line camelcase
  });

  if (assetsList.length > 0) {
    await Promise.all(
      assetsList.map(({label, alt, url}) => {
        debug('Add link to asset %o', label || alt);
        return got.post(urlJoin(gitlabApiUrl, `/projects/${encodedRepoId}/releases/${encodedGitTag}/assets/links`), {
          ...apiOptions,
          body: {name: label || alt, url: urlJoin(gitlabUrl, repoId, url)},
        });
      })
    );
  }

  logger.log('Published GitLab release: %s', gitTag);

  return {url: urlJoin(gitlabUrl, encodedRepoId, `/tags/${encodedGitTag}`), name: 'GitLab release'};
};
