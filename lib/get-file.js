const {stat} = require('fs-extra');
const {resolve} = require('path');

module.exports = async (path, {cwd, logger}) => {
  const file = resolve(cwd, path);
  let fileStat;

  try {
    fileStat = await stat(file);
  } catch (_) {
    logger.error('The path %s cannot be read, and will be ignored.', path);
    return null;
  }

  if (!fileStat || !fileStat.isFile()) {
    logger.error('The path %s is not a file, and will be ignored.', path);
    return null;
  }

  return file;
};
