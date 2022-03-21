/* eslint require-atomic-updates: off */

const verifyGitLab = require('./lib/verify');
const publishGitLab = require('./lib/publish');
const successGitLab = require('./lib/success');

let verified;

async function verifyConditions(pluginConfig, context) {
  await verifyGitLab(pluginConfig, context);
  verified = true;
}

async function publish(pluginConfig, context) {
  if (!verified) {
    await verifyGitLab(pluginConfig, context);
    verified = true;
  }

  return publishGitLab(pluginConfig, context);
}

async function success(pluginConfig, context) {
  if (!verified) {
    await verifyGitLab(pluginConfig, context);
    verified = true;
  }

  return successGitLab(pluginConfig, context);
}

module.exports = {verifyConditions, publish, success};
