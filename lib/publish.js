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
  const {gitlabToken, gitlabUrl, gitlabApiUrl, assets, milestones} = resolveConfig(pluginConfig, context);
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
    const globbedAssets = await getAssets(context, assets);
    debug('globbed assets: %o', globbedAssets);

    await Promise.all(
      globbedAssets.map(async asset => {
        const {path, label, type, filepath} = isPlainObject(asset) ? asset : {path: asset};
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
        debug('file type: %o', type);
        debug('file filepath: %o', filepath);

        // Uploaded assets to the project
        const form = new FormData();
        form.append('file', createReadStream(file));
        const {url, alt} = await got
          .post(urlJoin(gitlabApiUrl, `/projects/${encodedRepoId}/uploads`), {...apiOptions, body: form})
          .json();

        assetsList.push({label, alt, url, type, filepath});

        logger.log('Uploaded file: %s', url);
      })
    );
  }

  debug('Create a release for git tag %o with commit %o', gitTag, gitHead);
  await got.post(urlJoin(gitlabApiUrl, `/projects/${encodedRepoId}/releases`), {
    ...apiOptions,
    json: {
      /* eslint-disable camelcase */
      tag_name: gitTag,
      description: notes && notes.trim() ? notes : gitTag,
      milestones,
      assets: {
        links: assetsList.map(({label, alt, url, type, filepath}) => {
          return {
            name: label || alt,
            url: urlJoin(gitlabUrl, repoId, url),
            link_type: type,
            filepath,
          };
        }),
      },
      /* eslint-enable camelcase */
    },
  });

  logger.log('Published GitLab release: %s', gitTag);

  return {url: urlJoin(gitlabUrl, encodedRepoId, `/-/releases/${encodedGitTag}`), name: 'GitLab release'};
};
