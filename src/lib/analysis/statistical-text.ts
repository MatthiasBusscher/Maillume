import modelArtifact from "./models/meajor-v1.json";

type ModelFeature = {
  kind: "word" | "character";
  term: string;
  idf: number;
  weight: number;
};

type ModelCoefficient = {
  idf: number;
  weight: number;
};

type StatisticalTextModel = {
  schema: "maillume-statistical-text-model-v1";
  model_version: string;
  dataset: {
    doi: string;
    version: string;
    license: string;
    csv_md5: string;
  };
  training: {
    text_window_characters: number;
  };
  threshold: number;
  standalone_threshold: number;
  intercept: number;
  features: ModelFeature[];
};

const model = modelArtifact as StatisticalTextModel;
validateModel(model);

const wordFeatures = createFeatureMap("word");
const characterFeatures = createFeatureMap("character");

export const STATISTICAL_TEXT_MODEL_METADATA = Object.freeze({
  modelVersion: model.model_version,
  datasetDoi: model.dataset.doi,
  datasetVersion: model.dataset.version,
  datasetLicense: model.dataset.license,
  datasetChecksum: model.dataset.csv_md5,
  threshold: model.threshold,
  standaloneThreshold: model.standalone_threshold,
  featureCount: model.features.length,
  textWindowCharacters: model.training.text_window_characters,
});

export function scoreStatisticalUnwantedText(subject: string, body: string): number {
  const text = normalizeText(subject, body);
  if (!text) return 0;
  return scoreNormalizedText(text);
}

export function scoreEnglishStatisticalUnwantedText(
  subject: string,
  body: string,
): number | null {
  const text = normalizeText(subject, body);
  if (!text || !isLikelyEnglishNormalizedText(text)) return null;
  return scoreNormalizedText(text);
}

function scoreNormalizedText(text: string): number {
  const counts = new Map<ModelCoefficient, number>();
  const words = text.match(/[a-z0-9]+/g) ?? [];
  addTerms(counts, wordFeatures, words);
  addTerms(
    counts,
    wordFeatures,
    words.slice(0, -1).map((word, index) => `${word} ${words[index + 1]}`),
  );

  const padded = ` ${text} `;
  for (const size of [3, 4, 5]) {
    for (let index = 0; index <= padded.length - size; index += 1) {
      addTerm(counts, characterFeatures, padded.slice(index, index + size));
    }
  }

  let squaredNorm = 0;
  let weightedSum = 0;
  for (const [feature, count] of counts) {
    const value = (1 + Math.log(count)) * feature.idf;
    squaredNorm += value ** 2;
    weightedSum += value * feature.weight;
  }

  const norm = Math.sqrt(squaredNorm);
  const logit = model.intercept + (
    norm > 0 ? weightedSum / norm : 0
  );
  const boundedLogit = Math.max(-40, Math.min(40, logit));
  return 1 / (1 + Math.exp(-boundedLogit));
}

export function isStatisticallyUnwantedText(subject: string, body: string): boolean {
  return scoreStatisticalUnwantedText(subject, body) >= model.threshold;
}

export function isLikelyEnglishText(subject: string, body: string): boolean {
  return isLikelyEnglishNormalizedText(normalizeText(subject, body));
}

function isLikelyEnglishNormalizedText(text: string): boolean {
  const words = new Set(text.match(/[a-z0-9]+/g) ?? []);
  const englishMarkers = [
    "the", "your", "you", "and", "for", "with", "this", "that", "from",
    "please", "account", "email", "message", "review", "today",
  ];
  const dutchMarkers = [
    "de", "het", "een", "uw", "jouw", "je", "en", "voor", "van", "met",
    "dit", "dat", "vandaag", "bericht", "bekijk", "overleg", "morgen",
  ];
  const english = englishMarkers.filter((word) => words.has(word)).length;
  const dutch = dutchMarkers.filter((word) => words.has(word)).length;
  return dutch < 3 || english >= dutch;
}

function normalizeText(subject: string, body: string): string {
  return `${subject}\n${body}`
    .slice(0, 200)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .match(/[a-z0-9]+/g)
    ?.join(" ") ?? "";
}

function addTerms(
  counts: Map<ModelCoefficient, number>,
  features: Map<string, ModelCoefficient>,
  terms: string[],
): void {
  for (const term of terms) addTerm(counts, features, term);
}

function addTerm(
  counts: Map<ModelCoefficient, number>,
  features: Map<string, ModelCoefficient>,
  term: string,
): void {
  const feature = features.get(term);
  if (!feature) return;
  counts.set(feature, (counts.get(feature) ?? 0) + 1);
}

function createFeatureMap(kind: ModelFeature["kind"]): Map<string, ModelCoefficient> {
  return new Map(
    model.features
      .filter((feature) => feature.kind === kind)
      .map((feature) => [
        feature.term,
        { idf: feature.idf, weight: feature.weight },
      ]),
  );
}

function validateModel(value: StatisticalTextModel): void {
  if (
    value.schema !== "maillume-statistical-text-model-v1"
    || value.model_version !== "meajor-logistic-v1"
    || value.dataset.doi !== "10.5281/zenodo.18471483"
    || value.dataset.version !== "2.0"
    || value.dataset.license !== "CC-BY-4.0"
    || value.dataset.csv_md5 !== "aa8f59e96787cbd696c0b650e5400dc9"
    || value.training.text_window_characters !== 200
    || !Number.isFinite(value.threshold)
    || value.threshold <= 0
    || value.threshold >= 1
    || !Number.isFinite(value.standalone_threshold)
    || value.standalone_threshold < value.threshold
    || value.standalone_threshold >= 1
    || value.features.length !== 80_000
  ) {
    throw new Error("The bundled statistical text model failed integrity validation.");
  }
}
