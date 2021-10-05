const {createReadStream} = require('fs');
const {basename} = require('path');
const {isPlainObject} = require('lodash');
const FormData = require('form-data');
const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');
const getFile = require('./get-file');
const getAssets = require('./glob-assets');

module.exports = async (pluginConfig, context) => {
  const {
    options: {repositoryUrl},
    nextRelease: {gitTag, gitHead, notes},
    logger,
  } = context;
  const {gitlabToken, gitlabUrl, gitlabApiUrl, assets, generics, milestones} = resolveConfig(pluginConfig, context);
  const assetsList = [];
  const repoId = getRepoId(context, gitlabUrl, repositoryUrl);
  const encodedRepoId = encodeURIComponent(repoId);
  const encodedGitTag = encodeURIComponent(gitTag);
  const apiOptions = {headers: {'PRIVATE-TOKEN': gitlabToken}};

  debug('repoId: %o', repoId);
  debug('release name: %o', gitTag);
  debug('release ref: %o', gitHead);
  debug('milestones: %o', milestones);

  if (generics && generics.length > 0) {
    debug('generics: %o', generics);

    await Promise.all(
      generics.map(async generic => {
        const {path, label, status} = isPlainObject(generic)
          ? generic
          : {path: generic, label: basename(generic), status: 'default'};
        const file = await getFile(path, context);
        if (file === null) {
          return;
        }

        debug('file path: %o', path);
        debug('file label: %o', label);
        debug('file status: %o', status);

        // Upload generic package to the project
        const form = new FormData();
        form.append('file', createReadStream(file));

        const uploadEndpoint = urlJoin(
          gitlabApiUrl,
          `/projects/${encodedRepoId}/packages/generic/release/${encodedGitTag}/${label}${
            status ? `?status=${status}` : ''
          }`
        );

        debug('PUT-ing the file %s to %s', file, uploadEndpoint);

        let response;
        try {
          response = await got.put(uploadEndpoint, {...apiOptions, body: form}).json();
        } catch (error) {
          logger.error('An error occurred while uploading %s to the GitLab generics package API:\n%O', file, error);
          throw error;
        }

        const {url, alt} = response;

        assetsList.push({label, alt, url, type: 'package'});

        logger.log('Uploaded file: %s', url);
      })
    );
  }

  if (assets && assets.length > 0) {
    const globbedAssets = await getAssets(context, assets);
    debug('globbed assets: %o', globbedAssets);

    await Promise.all(
      globbedAssets.map(async asset => {
        const {path, label, type, filepath} = isPlainObject(asset) ? asset : {path: asset};
        const file = await getFile(path, context);
        if (file === null) {
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
          response = await got.post(uploadEndpoint, {...apiOptions, body: form}).json();
        } catch (error) {
          logger.error('An error occurred while uploading %s to the GitLab project uploads API:\n%O', file, error);
          throw error;
        }

        const {url, alt} = response;

        assetsList.push({label, alt, url, type, filepath});

        logger.log('Uploaded file: %s', url);
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
  };

  debug('POST-ing the following JSON to %s:\n%s', createReleaseEndpoint, JSON.stringify(json, null, 2));

  try {
    await got.post(createReleaseEndpoint, {
      ...apiOptions,
      json,
    });
  } catch (error) {
    logger.error('An error occurred while making a request to the GitLab release API:\n%O', error);
    throw error;
  }

  logger.log('Published GitLab release: %s', gitTag);

  return {url: urlJoin(gitlabUrl, encodedRepoId, `/-/releases/${encodedGitTag}`), name: 'GitLab release'};
};
