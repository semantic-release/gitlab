import { createReadStream, readFileSync } from "fs";
import pathlib from "path";
import fs from "fs-extra";
import { isPlainObject, template } from "lodash-es";
import FormData from "form-data";
import urlJoin from "url-join";
import got from "got";
import _debug from "debug";
const debug = _debug("semantic-release:gitlab");
import resolveConfig from "./resolve-config.js";
import getRepoId from "./get-repo-id.js";
import getAssets from "./glob-assets.js";
import { RELEASE_NAME } from "./definitions/constants.js";

export default async (pluginConfig, context) => {
  const {
    cwd,
    options: { repositoryUrl },
    nextRelease: { gitTag, gitHead, notes },
    logger,
  } = context;
  const { gitlabToken, gitlabUrl, gitlabApiUrl, assets, milestones, proxy } = resolveConfig(pluginConfig, context);
  const assetsList = [];
  const repoId = getRepoId(context, gitlabUrl, repositoryUrl);
  const encodedRepoId = encodeURIComponent(repoId);
  const encodedGitTag = encodeURIComponent(gitTag);
  const apiOptions = { headers: { "PRIVATE-TOKEN": gitlabToken } };

  debug("repoId: %o", repoId);
  debug("release name: %o", gitTag);
  debug("release ref: %o", gitHead);
  debug("milestones: %o", milestones);

  if (assets && assets.length > 0) {
    // Skip glob if url is provided
    const urlAssets = assets.filter((asset) => asset.url);
    debug("url assets: %o", urlAssets);
    const globbedAssets = await getAssets(
      context,
      assets.filter((asset) => !asset.url)
    );
    debug("globbed assets: %o", globbedAssets);
    const allAssets = [...urlAssets, ...globbedAssets];
    debug("all assets: %o", allAssets);

    await Promise.all(
      allAssets.map(async (asset) => {
        const { path } = isPlainObject(asset) ? asset : { path: asset };
        const _url = asset.url ? template(asset.url)(context) : undefined;
        const label = asset.label ? template(asset.label)(context) : undefined;
        const type = asset.type ? template(asset.type)(context) : undefined;
        const filepath = asset.filepath ? template(asset.filepath)(context) : undefined;
        const target = asset.target ? template(asset.target)(context) : undefined;
        const status = asset.status ? template(asset.status)(context) : undefined;

        if (_url) {
          assetsList.push({ label, rawUrl: _url, type, filepath });
          debug("use link from release setting: %s", _url);
        } else {
          const file = pathlib.resolve(cwd, path);

          let fileStat;

          try {
            fileStat = await fs.stat(file);
          } catch {
            logger.error("The asset %s cannot be read, and will be ignored.", path);
            return;
          }

          if (!fileStat || !fileStat.isFile()) {
            logger.error("The asset %s is not a file, and will be ignored.", path);
            return;
          }

          debug("file path: %o", path);
          debug("file label: %o", label);
          debug("file type: %o", type);
          debug("file filepath: %o", filepath);
          debug("file target: %o", target);
          debug("file status: %o", status);

          let uploadEndpoint;
          let response;

          if (target === "generic_package") {
            // Upload generic packages
            const encodedLabel = encodeURIComponent(label);
            uploadEndpoint = urlJoin(
              gitlabApiUrl,
              `/projects/${encodedRepoId}/packages/generic/release/${encodedGitTag}/${encodedLabel}?${
                status ? `status=${status}&` : ""
              }select=package_file`
            );

            debug("PUT-ing the file %s to %s", file, uploadEndpoint);

            try {
              response = await got.put(uploadEndpoint, { ...apiOptions, ...proxy, body: readFileSync(file) }).json();
            } catch (error) {
              logger.error("An error occurred while uploading %s to the GitLab generics package API:\n%O", file, error);
              throw error;
            }

            const { url } = response.file;

            assetsList.push({ label, alt: "release", url, type: "package", filepath, target });

            logger.log("Uploaded file: %s", url);
          } else {
            // Handle normal assets
            uploadEndpoint = urlJoin(gitlabApiUrl, `/projects/${encodedRepoId}/uploads`);

            debug("POST-ing the file %s to %s", file, uploadEndpoint);

            try {
              const form = new FormData();
              form.append("file", createReadStream(file));
              response = await got.post(uploadEndpoint, { ...apiOptions, ...proxy, body: form }).json();
            } catch (error) {
              logger.error("An error occurred while uploading %s to the GitLab project uploads API:\n%O", file, error);
              throw error;
            }

            const { url, alt } = response;

            assetsList.push({ label, alt, url, type, filepath, target });

            logger.log("Uploaded file: %s", url);
          }
        }
      })
    );
  }

  debug("Create a release for git tag %o with commit %o", gitTag, gitHead);

  const createReleaseEndpoint = urlJoin(gitlabApiUrl, `/projects/${encodedRepoId}/releases`);

  const json = {
    /* eslint-disable camelcase */
    tag_name: gitTag,
    description: notes && notes.trim() ? notes : gitTag,
    milestones,
    assets: {
      links: assetsList.map(({ label, alt, url, type, filepath, rawUrl, target }) => {
        return {
          name: label || alt,
          url: rawUrl || (target === "generic_package" ? url : urlJoin(gitlabUrl, repoId, url)),
          link_type: type,
          filepath,
        };
      }),
    },
    /* eslint-enable camelcase */
  };

  debug("POST-ing the following JSON to %s:\n%s", createReleaseEndpoint, JSON.stringify(json, null, 2));

  try {
    await got.post(createReleaseEndpoint, {
      ...apiOptions,
      ...proxy,
      json,
    });
  } catch (error) {
    logger.error("An error occurred while making a request to the GitLab release API:\n%O", error);
    throw error;
  }

  logger.log("Published GitLab release: %s", gitTag);

  const releaseUrl = urlJoin(gitlabUrl, repoId, `/-/releases/${encodedGitTag}`);

  return { name: RELEASE_NAME, url: releaseUrl };
};
