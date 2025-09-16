import { OPTIONS, validateOption, getOptionDefinition } from "./definitions/options.js";
import getError from "./get-error.js";

/**
 * Validate plugin configuration options
 * @param {Object} options - The options to validate
 * @returns {Error[]} - Array of validation errors
 */
export function validateOptions(options) {
  const errors = [];

  // Validate each option that has a defined validator
  for (const [optionName, optionValue] of Object.entries(options)) {
    if (!validateOption(optionName, optionValue)) {
      const optionDefinition = getOptionDefinition(optionName);
      if (optionDefinition) {
        const errorCode = `EINVALID${optionDefinition.errorCode}`;
        errors.push(getError(errorCode, { [optionName]: optionValue }));
      }
    }
  }

  return errors;
}

/**
 * Get all supported option names
 * @returns {string[]} - Array of supported option names
 */
export function getSupportedOptions() {
  return OPTIONS.map((option) => option.name);
}

/**
 * Check if an option is supported (has validation)
 * @param {string} optionName - Name of the option to check
 * @returns {boolean} - True if option is supported
 */
export function isSupportedOption(optionName) {
  return OPTIONS.some((option) => option.name === optionName);
}
