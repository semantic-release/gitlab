const {createReadStream} = require('fs');
const {parse, resolve} = require('path');
const {stat} = require('fs-extra');
const FormData = require('form-data');
const urlJoin = require('url-join');
const got = require('got');
const debug = require('debug')('semantic-release:gitlab');
const resolveConfig = require('./resolve-config');
const getRepoId = require('./get-repo-id');
const getAssets = require('./get-assets');

module.exports = async (pluginConfig, context) => {
  const {
    cwd,
    options: {repositoryUrl},
    nextRelease: {gitTag, gitHead, notes},
    logger,
  } = context;
  const {gitlabToken, gitlabUrl, gitlabApiPathPrefix, assets} = resolveConfig(pluginConfig, context);
  const repoId = getRepoId(gitlabUrl, repositoryUrl);
  const encodedRepoId = encodeURIComponent(repoId);
  const encodedGitTag = encodeURIComponent(gitTag);
  const apiBase = urlJoin(gitlabUrl, gitlabApiPathPrefix);
  const apiProject = urlJoin(apiBase, `/projects/${encodedRepoId}`);
  const apiOptions = {
    json: true,
    headers: {
      'PRIVATE-TOKEN': gitlabToken,
    },
  };
  let finalNotes = notes;

  debug('repoId: %o', repoId);
  debug('release name: %o', gitTag);
  debug('release ref: %o', gitHead);

  if (assets && assets.length > 0) {
    const globbedAssets = await getAssets(context, assets);
    const assetsMd = [];
    debug('globed assets: %o', globbedAssets);

    await Promise.all(
      globbedAssets.map(async asset => {
        const filePath = asset.path;
        let fileStat;
        let file;

        try {
          file = resolve(cwd, filePath);
          fileStat = await stat(file);
        } catch (error) {
          logger.error('The asset %s cannot be read, and will be ignored.', filePath);
          return;
        }
        if (!fileStat || !fileStat.isFile()) {
          logger.error('The asset %s is not a file, and will be ignored.', filePath);
          return;
        }

        const fileName = asset.name;
        debug('file path: %o', filePath);
        debug('file name: %o', fileName);

        // Uploaded assets to the project
        let body;
        try {
          const form = new FormData();
          form.append('file', createReadStream(file));

          ({body} = await got.post(urlJoin(apiProject, '/uploads'), {
            ...apiOptions,
            json: false,
            body: form,
          }));
          body = JSON.parse(body);
        } catch (error) {
          logger.error('Error %o uploading the asset %s, and will be ignored.', error.body, fileName);
          return;
        }

        // Replace the markdown asset definition label
        if (asset.label) {
          const regExpName = new RegExp(`\\[(${parse(fileName).name}|${fileName})\\]`);
          body.markdown = body.markdown.replace(regExpName, `[${asset.label}]`);
        }
        assetsMd.push(`* ${body.markdown}`);

        logger.log('Uploaded file: %s', body.url);
      })
    );
    // Append assets to release notes
    finalNotes = `${notes}\n\n#### Assets\n\n${assetsMd.join('\n')}`;
  }

  debug('Update git tag %o with commit %o and release description', gitTag, gitHead);
  await got.post(urlJoin(apiProject, `/repository/tags/${encodedGitTag}/release`), {
    ...apiOptions,
    body: {tag_name: gitTag, description: finalNotes}, // eslint-disable-line camelcase
  });

  logger.log('Published GitLab release: %s', gitTag);

  return {url: urlJoin(gitlabUrl, encodedRepoId, `/tags/${encodedGitTag}`), name: 'GitLab release'};
};
