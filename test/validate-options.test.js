import test from "ava";
import { validateOptions, getSupportedOptions, isSupportedOption } from "../lib/validate-options.js";
import { OPTIONS, validateOption, getOptionDefinition } from "../lib/definitions/options.js";

test("getSupportedOptions returns all option names", (t) => {
  const supportedOptions = getSupportedOptions();
  t.deepEqual(supportedOptions, ["assets", "failTitle", "failComment", "labels", "assignee"]);
});

test("isSupportedOption correctly identifies supported options", (t) => {
  t.true(isSupportedOption("assets"));
  t.true(isSupportedOption("failTitle"));
  t.true(isSupportedOption("failComment"));
  t.true(isSupportedOption("labels"));
  t.true(isSupportedOption("assignee"));
  t.false(isSupportedOption("unsupportedOption"));
});

test("validateOption returns true for valid assets option", (t) => {
  t.true(validateOption("assets", ["file.js"]));
  t.true(validateOption("assets", [{ path: "file.js" }]));
  t.true(validateOption("assets", [{ url: "http://example.com/file.js" }]));
  t.true(validateOption("assets", ["file1.js", { path: "file2.js" }]));
});

test("validateOption returns false for invalid assets option", (t) => {
  t.false(validateOption("assets", "not-an-array"));
  t.false(validateOption("assets", [{}])); // Object without path or url
  t.false(validateOption("assets", [{ path: "" }])); // Empty path
  t.false(validateOption("assets", [42])); // Invalid array element
});

test("validateOption returns true for valid failTitle option", (t) => {
  t.true(validateOption("failTitle", "Custom fail title"));
  t.true(validateOption("failTitle", false)); // Can be disabled
  t.true(validateOption("failTitle", null)); // Nil values are valid
  t.true(validateOption("failTitle", undefined)); // Nil values are valid
});

test("validateOption returns false for invalid failTitle option", (t) => {
  t.false(validateOption("failTitle", ""));
  t.false(validateOption("failTitle", "   ")); // Whitespace only
  t.false(validateOption("failTitle", 42));
  t.false(validateOption("failTitle", true)); // true is not allowed, only false
});

test("validateOption returns true for valid failComment option", (t) => {
  t.true(validateOption("failComment", "Custom fail comment"));
  t.true(validateOption("failComment", false)); // Can be disabled
  t.true(validateOption("failComment", null)); // Nil values are valid
  t.true(validateOption("failComment", undefined)); // Nil values are valid
});

test("validateOption returns false for invalid failComment option", (t) => {
  t.false(validateOption("failComment", ""));
  t.false(validateOption("failComment", "   ")); // Whitespace only
  t.false(validateOption("failComment", 42));
  t.false(validateOption("failComment", true)); // true is not allowed, only false
});

test("validateOption returns true for valid labels option", (t) => {
  t.true(validateOption("labels", "bug,enhancement"));
  t.true(validateOption("labels", false)); // Can be disabled
  t.true(validateOption("labels", null)); // Nil values are valid
  t.true(validateOption("labels", undefined)); // Nil values are valid
});

test("validateOption returns false for invalid labels option", (t) => {
  t.false(validateOption("labels", ""));
  t.false(validateOption("labels", "   ")); // Whitespace only
  t.false(validateOption("labels", 42));
  t.false(validateOption("labels", true)); // true is not allowed, only false
});

test("validateOption returns true for valid assignee option", (t) => {
  t.true(validateOption("assignee", "username"));
  t.true(validateOption("assignee", null)); // Nil values are valid
  t.true(validateOption("assignee", undefined)); // Nil values are valid
});

test("validateOption returns false for invalid assignee option", (t) => {
  t.false(validateOption("assignee", ""));
  t.false(validateOption("assignee", "   ")); // Whitespace only
  t.false(validateOption("assignee", 42));
  t.false(validateOption("assignee", false)); // assignee cannot be disabled
});

test("validateOption returns true for unknown options", (t) => {
  // Unknown options should be considered valid (may be handled elsewhere)
  t.true(validateOption("unknownOption", "any-value"));
  t.true(validateOption("anotherUnknown", 42));
});

test("validateOptions returns empty array for valid configuration", (t) => {
  const options = {
    assets: ["file.js"],
    failTitle: "Build failed",
    failComment: "The build has failed",
    labels: "bug",
    assignee: "maintainer",
  };
  const errors = validateOptions(options);
  t.deepEqual(errors, []);
});

test("validateOptions returns errors for invalid configuration", (t) => {
  const options = {
    assets: "not-an-array", // Invalid
    failTitle: "", // Invalid
    assignee: 42, // Invalid
  };
  const errors = validateOptions(options);
  t.is(errors.length, 3);
  t.is(errors[0].code, "EINVALIDASSETS");
  t.is(errors[1].code, "EINVALIDFAILTITLE");
  t.is(errors[2].code, "EINVALIDASSIGNEE");
});

test("validateOptions ignores unknown options", (t) => {
  const options = {
    assets: ["file.js"], // Valid
    unknownOption: "any-value", // Unknown, should be ignored
  };
  const errors = validateOptions(options);
  t.deepEqual(errors, []);
});

test("getOptionDefinition returns correct definition", (t) => {
  const assetsDef = getOptionDefinition("assets");
  t.is(assetsDef.name, "assets");
  t.is(assetsDef.errorCode, "ASSETS");
  t.is(typeof assetsDef.validate, "function");

  const unknownDef = getOptionDefinition("unknown");
  t.is(unknownDef, undefined);
});

test("OPTIONS array contains all expected options", (t) => {
  const optionNames = OPTIONS.map((option) => option.name);
  t.deepEqual(optionNames, ["assets", "failTitle", "failComment", "labels", "assignee"]);

  // Verify each option has required properties
  for (const option of OPTIONS) {
    t.is(typeof option.name, "string");
    t.is(typeof option.validate, "function");
    t.is(typeof option.errorCode, "string");
    t.is(typeof option.description, "string");
  }
});
