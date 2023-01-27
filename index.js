/* eslint require-atomic-updates: off */

import verifyGitLab from "./lib/verify.js";
import publishGitLab from "./lib/publish.js";
import successGitLab from "./lib/success.js";
import failGitLab from "./lib/fail.js";

let verified;

export async function verifyConditions(pluginConfig, context) {
  await verifyGitLab(pluginConfig, context);
  verified = true;
}

export async function publish(pluginConfig, context) {
  if (!verified) {
    await verifyGitLab(pluginConfig, context);
    verified = true;
  }

  return publishGitLab(pluginConfig, context);
}

export async function success(pluginConfig, context) {
  if (!verified) {
    await verifyGitLab(pluginConfig, context);
    verified = true;
  }

  return successGitLab(pluginConfig, context);
}

export async function fail(pluginConfig, context) {
  if (!verified) {
    await verifyGitLab(pluginConfig, context);
    verified = true;
  }

  return failGitLab(pluginConfig, context);
}
