const verifyGitLab = require('./lib/verify');
const publishGitLab = require('./lib/publish');

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
  await publishGitLab(pluginConfig, context);
}

module.exports = {verifyConditions, publish};
