import { isString, isPlainObject, isArray } from "lodash-es";

const isNonEmptyString = (value) => isString(value) && value.trim() !== "";
const isStringOrStringArray = (value) =>
  isNonEmptyString(value) || (isArray(value) && value.every((item) => isNonEmptyString(item)));
const isArrayOf = (validator) => (array) => isArray(array) && array.every((value) => validator(value));
const canBeDisabled = (validator) => (value) => value === false || validator(value);

/**
 * Validates asset configuration
 * @param {*} asset - The asset to validate
 * @returns {boolean} - True if asset is valid
 */
const validateAsset = (asset) =>
  isStringOrStringArray(asset) ||
  (isPlainObject(asset) && (isNonEmptyString(asset.url) || isStringOrStringArray(asset.path)));

/**
 * Option definitions for semantic-release/gitlab plugin
 * Each option has a name, validator function, and error code prefix
 */
export const OPTIONS = [
  {
    name: "assets",
    validate: isArrayOf(validateAsset),
    errorCode: "ASSETS",
    description: "Array of asset configurations for release uploads",
  },
  {
    name: "failTitle",
    validate: canBeDisabled(isNonEmptyString),
    errorCode: "FAILTITLE", 
    description: "Title for failure issue (can be disabled with false)",
  },
  {
    name: "failComment",
    validate: canBeDisabled(isNonEmptyString),
    errorCode: "FAILCOMMENT",
    description: "Comment for failure issue (can be disabled with false)",
  },
  {
    name: "labels",
    validate: canBeDisabled(isNonEmptyString),
    errorCode: "LABELS",
    description: "Labels for issues (can be disabled with false)",
  },
  {
    name: "assignee", 
    validate: isNonEmptyString,
    errorCode: "ASSIGNEE",
    description: "Assignee for issues",
  },
];

/**
 * Get option definition by name
 * @param {string} name - Option name
 * @returns {Object|undefined} - Option definition or undefined if not found
 */
export function getOptionDefinition(name) {
  return OPTIONS.find(option => option.name === name);
}

/**
 * Validate a single option value
 * @param {string} name - Option name  
 * @param {*} value - Option value to validate
 * @returns {boolean} - True if option is valid
 */
export function validateOption(name, value) {
  const option = getOptionDefinition(name);
  if (!option) {
    // Unknown options are considered valid (they may be handled elsewhere)
    return true;
  }
  
  // Nil values are considered valid (they represent defaults or unset options)
  if (value === null || value === undefined) {
    return true;
  }
  
  return option.validate(value);
}

/**
 * Get all option names that have validators
 * @returns {string[]} - Array of option names
 */
export function getValidatedOptionNames() {
  return OPTIONS.map(option => option.name);
}