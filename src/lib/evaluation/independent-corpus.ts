import { INDEPENDENT_DEVELOPMENT } from "./independent-development";
import { INDEPENDENT_HOLDOUT } from "./independent-holdout";
import { INDEPENDENT_VALIDATION } from "./independent-validation";

export {
  INDEPENDENT_DEVELOPMENT,
  INDEPENDENT_HOLDOUT,
  INDEPENDENT_VALIDATION,
};

export const INDEPENDENT_CORPUS = [
  ...INDEPENDENT_DEVELOPMENT,
  ...INDEPENDENT_VALIDATION,
  ...INDEPENDENT_HOLDOUT,
];
