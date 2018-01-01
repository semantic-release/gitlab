const verifyGitLab = require('./lib/verify');
const publishGitLab = require('./lib/publish');

let verified;

async function verifyConditions(pluginConfig, {options, logger}) {
  await verifyGitLab(pluginConfig, options, logger);
  verified = true;
}

async function publish(pluginConfig, {nextRelease, options, logger}) {
  if (!verified) {
    await verifyGitLab(pluginConfig, options, logger);
    verified = true;
  }
  await publishGitLab(pluginConfig, options, nextRelease, logger);
}

module.exports = {verifyConditions, publish};
