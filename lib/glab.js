import { execa } from "execa";

export default async (args, options) => {
  return execa("glab", args, options);
};
