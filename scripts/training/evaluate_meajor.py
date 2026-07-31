#!/usr/bin/env python3
"""Run the one-time source-held-out MeAJOR evaluation for a frozen model."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from meajor_common import (
    DATASET_CSV_MD5,
    LOCKED_SOURCE,
    binary_metrics,
    build_feature_map,
    load_examples,
    load_model,
    score_exported_model,
    verify_dataset,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument("--model", required=True, type=Path)
    arguments = parser.parse_args()

    verify_dataset(arguments.csv)
    model = load_model(arguments.model)
    if model["dataset"]["csv_md5"] != DATASET_CSV_MD5:
        raise RuntimeError("Model was trained from a different dataset revision.")
    examples, ingestion = load_examples(arguments.csv)
    locked = [item for item in examples if item.source == LOCKED_SOURCE]
    feature_map = build_feature_map(model)
    probabilities = [
        score_exported_model(model, item.text, feature_map)
        for item in locked
    ]
    metrics = binary_metrics(
        [item.label for item in locked],
        probabilities,
        model["threshold"],
    )
    output = {
        "schema": "maillume-meajor-locked-evaluation-v1",
        "model_version": model["model_version"],
        "dataset": model["dataset"],
        "locked_source": LOCKED_SOURCE,
        "examples": len(locked),
        "ingestion": ingestion,
        "threshold": model["threshold"],
        "metrics": metrics,
        "passed": (
            metrics["precision"] >= 0.90
            and metrics["recall"] >= 0.90
            and metrics["false_positive_rate"] <= 0.02
        ),
    }
    print(json.dumps(output, indent=2))
    if not output["passed"]:
        raise RuntimeError("MeAJOR source-held-out release gates failed.")


if __name__ == "__main__":
    main()
