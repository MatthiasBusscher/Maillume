import type {
  AnalysisLocale,
  EmailAnalysisInput,
  ScanSource,
} from "../types";
import type {
  EvaluationExpectation,
  EvaluationScenarioCategory,
} from "./types";

export const INDEPENDENT_CORPUS_SPLITS = [
  "development",
  "validation",
  "locked",
] as const;
export type IndependentCorpusSplit = (typeof INDEPENDENT_CORPUS_SPLITS)[number];

export type IndependentCorpusProvenance =
  | {
      kind: "synthetic";
      basis: string;
      authoring: "independently_written";
    }
  | {
      kind: "public_advisory";
      url: string;
      publishedAt: string;
      adaptation: string;
    }
  | {
      kind: "product_template";
      path: string;
      adaptation: string;
    };

export type IndependentEvaluationCase = {
  id: string;
  split: IndependentCorpusSplit;
  classification: EvaluationExpectation;
  locale: AnalysisLocale;
  source: ScanSource;
  scenarioCategory: EvaluationScenarioCategory;
  input: EmailAnalysisInput;
  provenance: IndependentCorpusProvenance;
};

type IndependentCaseDefinition = Omit<
  IndependentEvaluationCase,
  "split" | "input"
> & {
  input: Omit<EmailAnalysisInput, "locale">;
};

export function defineIndependentCases(
  split: IndependentCorpusSplit,
  cases: IndependentCaseDefinition[],
): IndependentEvaluationCase[] {
  return cases.map((item) => ({
    ...item,
    split,
    input: {
      ...item.input,
      locale: item.locale,
    },
  }));
}

export function syntheticProvenance(
  basis: string,
): IndependentCorpusProvenance {
  return {
    kind: "synthetic",
    basis,
    authoring: "independently_written",
  };
}
