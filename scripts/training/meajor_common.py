"""Shared, content-safe helpers for the optional MeAJOR training pipeline."""

from __future__ import annotations

import csv
import hashlib
import json
import math
import re
import unicodedata
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

DATASET_DOI = "10.5281/zenodo.18471483"
DATASET_VERSION = "2.0"
DATASET_LICENSE = "CC-BY-4.0"
DATASET_CSV_BYTES = 191_121_228
DATASET_CSV_MD5 = "aa8f59e96787cbd696c0b650e5400dc9"
TRAIN_SOURCE = "trec5"
DEVELOPMENT_SOURCE = "trec6"
VALIDATION_SOURCE = "trec6-group-holdout"
LOCKED_SOURCE = "trec7"
MAX_TEXT_CHARS = 200
TOKEN_PATTERN = re.compile(r"[a-z0-9]+")


@dataclass(frozen=True)
class Example:
    source: str
    label: int
    text: str
    group: str


def verify_dataset(path: Path) -> None:
    if path.stat().st_size != DATASET_CSV_BYTES:
        raise RuntimeError(
            f"Unexpected MeAJOR CSV size: {path.stat().st_size}; "
            f"expected {DATASET_CSV_BYTES}."
        )
    digest = hashlib.md5(usedforsecurity=False)
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    actual_checksum = digest.hexdigest()
    if actual_checksum != DATASET_CSV_MD5:
        raise RuntimeError(
            f"Unexpected MeAJOR CSV checksum: {actual_checksum}; "
            f"expected {DATASET_CSV_MD5}."
        )


def normalize_text(subject: str, body: str) -> str:
    combined = f"{subject}\n{body}"[:MAX_TEXT_CHARS]
    decomposed = unicodedata.normalize("NFKD", combined)
    without_marks = "".join(
        character
        for character in decomposed
        if unicodedata.category(character) != "Mn"
    )
    return " ".join(TOKEN_PATTERN.findall(without_marks.lower()))


def tokenize(text: str) -> list[str]:
    words = TOKEN_PATTERN.findall(text)
    return words + [
        f"{words[index]} {words[index + 1]}"
        for index in range(len(words) - 1)
    ]


def character_features(text: str) -> list[str]:
    compact = f" {text} "
    return [
        compact[index:index + size]
        for size in (3, 4, 5)
        for index in range(max(0, len(compact) - size + 1))
    ]


def load_examples(path: Path) -> tuple[list[Example], dict[str, int]]:
    examples: list[Example] = []
    rejected = 0
    with path.open(newline="", encoding="utf-8") as handle:
        for row in csv.DictReader(handle):
            source = row.get("source", "")
            raw_label = row.get("label", "")
            if source not in {TRAIN_SOURCE, DEVELOPMENT_SOURCE, LOCKED_SOURCE}:
                rejected += 1
                continue
            if raw_label not in {"0", "0.0", "1", "1.0"}:
                rejected += 1
                continue
            text = normalize_text(row.get("subject", ""), row.get("body", ""))
            if not text:
                rejected += 1
                continue
            group = hashlib.sha256(text.encode("utf-8")).hexdigest()
            examples.append(
                Example(
                    source=source,
                    label=1 if raw_label.startswith("1") else 0,
                    text=text,
                    group=group,
                )
            )

    # A duplicate belongs to the most protected source in which it occurs.
    source_priority = {
        TRAIN_SOURCE: 0,
        DEVELOPMENT_SOURCE: 1,
        LOCKED_SOURCE: 2,
    }
    group_owner: dict[str, str] = {}
    for example in examples:
        owner = group_owner.get(example.group)
        if owner is None or source_priority[example.source] > source_priority[owner]:
            group_owner[example.group] = example.source

    deduplicated = [
        example
        for example in examples
        if group_owner[example.group] == example.source
    ]
    stats = {
        "loaded": len(examples),
        "deduplicated": len(deduplicated),
        "cross_source_duplicates_removed": len(examples) - len(deduplicated),
        "rejected": rejected,
    }
    return deduplicated, stats


def is_validation_group(group: str) -> bool:
    # Stable 20% group split. Identical normalized messages always stay together.
    return int(group[:2], 16) < 51


def binary_metrics(labels: Iterable[int], probabilities: Iterable[float], threshold: float):
    tp = fp = tn = fn = 0
    for label, probability in zip(labels, probabilities, strict=True):
        prediction = probability >= threshold
        if label == 1 and prediction:
            tp += 1
        elif label == 0 and prediction:
            fp += 1
        elif label == 0:
            tn += 1
        else:
            fn += 1
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    false_positive_rate = fp / (fp + tn) if fp + tn else 0.0
    f1 = (
        2 * precision * recall / (precision + recall)
        if precision + recall
        else 0.0
    )
    return {
        "true_positive": tp,
        "false_positive": fp,
        "true_negative": tn,
        "false_negative": fn,
        "precision": precision,
        "recall": recall,
        "false_positive_rate": false_positive_rate,
        "f1": f1,
    }


def choose_threshold(labels: list[int], probabilities: list[float]) -> tuple[float, dict]:
    candidates = []
    assessed = []
    for step in range(500, 996):
        threshold = step / 1000
        metrics = binary_metrics(labels, probabilities, threshold)
        assessed.append((threshold, metrics))
        if (
            metrics["precision"] >= 0.90
            and metrics["recall"] >= 0.90
            and metrics["false_positive_rate"] <= 0.02
        ):
            candidates.append((threshold, metrics))
    if not candidates:
        best_f1 = max(assessed, key=lambda item: item[1]["f1"])
        best_recall_at_precision = max(
            (
                item
                for item in assessed
                if item[1]["precision"] >= 0.90
            ),
            key=lambda item: item[1]["recall"],
            default=None,
        )
        best_precision_at_recall = max(
            (
                item
                for item in assessed
                if item[1]["recall"] >= 0.90
            ),
            key=lambda item: item[1]["precision"],
            default=None,
        )
        raise RuntimeError(
            "No validation threshold satisfies >=90% precision and recall "
            "with <=2% false-positive rate. Diagnostics: "
            + json.dumps(
                {
                    "best_f1": best_f1,
                    "best_recall_at_90_precision": best_recall_at_precision,
                    "best_precision_at_90_recall": best_precision_at_recall,
                },
                separators=(",", ":"),
            )
        )
    return max(
        candidates,
        key=lambda item: (
            item[1]["f1"],
            item[1]["recall"],
            item[1]["precision"],
            item[0],
        ),
    )


def choose_standalone_threshold(
    labels: list[int],
    probabilities: list[float],
) -> tuple[float, dict]:
    candidates = []
    for step in range(500, 1000):
        threshold = step / 1000
        metrics = binary_metrics(labels, probabilities, threshold)
        if (
            metrics["precision"] >= 0.98
            and metrics["false_positive_rate"] <= 0.002
        ):
            candidates.append((threshold, metrics))
    if not candidates:
        raise RuntimeError(
            "No standalone threshold satisfies >=98% precision with "
            "<=0.2% false-positive rate."
        )
    return max(
        candidates,
        key=lambda item: (
            item[1]["recall"],
            item[1]["precision"],
            item[0],
        ),
    )


def load_model(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        model = json.load(handle)
    if model.get("schema") != "maillume-statistical-text-model-v1":
        raise RuntimeError("Unsupported statistical text model schema.")
    return model


def build_feature_map(model: dict) -> dict[tuple[str, str], tuple[float, float]]:
    return {
        (item["kind"], item["term"]): (item["idf"], item["weight"])
        for item in model["features"]
    }


def score_exported_model(
    model: dict,
    text: str,
    feature_map: dict[tuple[str, str], tuple[float, float]] | None = None,
) -> float:
    if feature_map is None:
        feature_map = build_feature_map(model)
    counts: dict[tuple[str, str], int] = {}
    for kind, terms in (
        ("word", tokenize(text)),
        ("character", character_features(text)),
    ):
        for term in terms:
            key = (kind, term)
            if key in feature_map:
                counts[key] = counts.get(key, 0) + 1
    weighted = []
    for key, count in counts.items():
        idf, coefficient = feature_map[key]
        value = (1.0 + math.log(count)) * idf
        weighted.append((value, coefficient))
    norm = math.sqrt(sum(value * value for value, _ in weighted))
    logit = model["intercept"]
    if norm:
        logit += sum(value * coefficient for value, coefficient in weighted) / norm
    return 1.0 / (1.0 + math.exp(-max(-40.0, min(40.0, logit))))
