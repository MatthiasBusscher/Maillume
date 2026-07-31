#!/usr/bin/env python3
"""Train the compact MeAJOR supporting classifier without exposing message text."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from scipy.sparse import csr_matrix, hstack
from sklearn.feature_extraction.text import TfidfTransformer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import normalize

from meajor_common import (
    DATASET_CSV_MD5,
    DATASET_DOI,
    DATASET_LICENSE,
    DATASET_VERSION,
    DEVELOPMENT_SOURCE,
    CHARACTER_BUCKET_COUNT,
    LOCKED_SOURCE,
    MAX_TEXT_CHARS,
    TRAIN_SOURCE,
    VALIDATION_SOURCE,
    WORD_BUCKET_COUNT,
    binary_metrics,
    build_feature_map,
    character_features,
    choose_threshold,
    choose_standalone_threshold,
    feature_bucket,
    is_validation_group,
    load_examples,
    score_exported_model,
    tokenize,
    verify_dataset,
)


def hashed_term_counts(
    texts: list[str],
    feature_kind: str,
    bucket_count: int,
) -> csr_matrix:
    extractor = tokenize if feature_kind == "word" else character_features
    rows: list[int] = []
    columns: list[int] = []
    values: list[int] = []
    for row, text in enumerate(texts):
        counts: dict[int, int] = {}
        for term in extractor(text):
            bucket = feature_bucket(term, bucket_count)
            counts[bucket] = counts.get(bucket, 0) + 1
        rows.extend([row] * len(counts))
        columns.extend(counts)
        values.extend(counts.values())
    return csr_matrix(
        (values, (rows, columns)),
        shape=(len(texts), bucket_count),
        dtype=np.float64,
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    arguments = parser.parse_args()

    verify_dataset(arguments.csv)
    # The independent locked source is intentionally excluded from all tuning
    # and artifact-generation work.
    examples, ingestion = load_examples(arguments.csv, include_locked=False)
    training = [
        item
        for item in examples
        if item.source == TRAIN_SOURCE
        or (
            item.source == DEVELOPMENT_SOURCE
            and not is_validation_group(item.group)
        )
    ]
    validation = [
        item
        for item in examples
        if item.source == DEVELOPMENT_SOURCE
        and is_validation_group(item.group)
    ]

    training_texts = [item.text for item in training]
    validation_texts = [item.text for item in validation]
    word_transformer = TfidfTransformer(sublinear_tf=True, norm=None)
    character_transformer = TfidfTransformer(sublinear_tf=True, norm=None)
    training_word_counts = hashed_term_counts(
        training_texts, "word", WORD_BUCKET_COUNT,
    )
    validation_word_counts = hashed_term_counts(
        validation_texts, "word", WORD_BUCKET_COUNT,
    )
    training_character_counts = hashed_term_counts(
        training_texts, "character", CHARACTER_BUCKET_COUNT,
    )
    validation_character_counts = hashed_term_counts(
        validation_texts, "character", CHARACTER_BUCKET_COUNT,
    )
    training_matrix = normalize(hstack([
        word_transformer.fit_transform(training_word_counts),
        character_transformer.fit_transform(training_character_counts),
    ], format="csr"))
    validation_matrix = normalize(hstack([
        word_transformer.transform(validation_word_counts),
        character_transformer.transform(validation_character_counts),
    ], format="csr"))
    classifier = LogisticRegression(
        C=1.0,
        class_weight="balanced",
        max_iter=200,
        random_state=20260731,
        solver="liblinear",
    )
    classifier.fit(training_matrix, [item.label for item in training])
    validation_probabilities = classifier.predict_proba(validation_matrix)[:, 1].tolist()
    threshold, validation_metrics = choose_threshold(
        [item.label for item in validation],
        validation_probabilities,
    )
    standalone_threshold, standalone_validation_metrics = (
        choose_standalone_threshold(
            [item.label for item in validation],
            validation_probabilities,
        )
    )

    coefficients = classifier.coef_[0]
    features = [
        {
            "kind": kind,
            "bucket": bucket,
            "idf": round(float(term_idf), 8),
            "weight": round(float(weight), 8),
        }
        for kind, bucket_count, idf, weights in (
            (
                "word",
                WORD_BUCKET_COUNT,
                word_transformer.idf_,
                coefficients[:WORD_BUCKET_COUNT],
            ),
            (
                "character",
                CHARACTER_BUCKET_COUNT,
                character_transformer.idf_,
                coefficients[WORD_BUCKET_COUNT:],
            ),
        )
        for bucket, term_idf, weight in zip(
            range(bucket_count), idf, weights, strict=True,
        )
    ]
    artifact = {
        "schema": "maillume-statistical-text-model-v1",
        "model_version": "meajor-logistic-v2",
        "dataset": {
            "doi": DATASET_DOI,
            "version": DATASET_VERSION,
            "license": DATASET_LICENSE,
            "csv_md5": DATASET_CSV_MD5,
        },
        "training": {
            "sources": [TRAIN_SOURCE, DEVELOPMENT_SOURCE],
            "validation_source": VALIDATION_SOURCE,
            "locked_source": LOCKED_SOURCE,
            "ingestion": ingestion,
            "training_examples": len(training),
            "validation_examples": len(validation),
            "feature_count": len(features),
            "text_window_characters": MAX_TEXT_CHARS,
            "validation_metrics": validation_metrics,
            "standalone_validation_metrics": standalone_validation_metrics,
        },
        "tokenizer": {
            "normalization": "NFKD-strip-marks-lower-ascii-alnum-digit-redaction",
            "features": "word-unigrams-and-bigrams-plus-character-3-to-5-grams",
            "representation": "lossy-fnv1a-feature-buckets",
            "word_bucket_count": WORD_BUCKET_COUNT,
            "character_bucket_count": CHARACTER_BUCKET_COUNT,
            "sublinear_tf": True,
            "l2_normalized": True,
        },
        "threshold": threshold,
        "standalone_threshold": standalone_threshold,
        "intercept": round(float(classifier.intercept_[0]), 8),
        "features": features,
    }

    sample_indexes = np.linspace(
        0,
        len(validation) - 1,
        num=min(100, len(validation)),
        dtype=int,
    )
    exported_feature_map = build_feature_map(artifact)
    for index in sample_indexes:
        exported_probability = score_exported_model(
            artifact,
            validation[index].text,
            exported_feature_map,
        )
        fitted_probability = validation_probabilities[index]
        if abs(exported_probability - fitted_probability) > 1e-6:
            raise RuntimeError(
                "Exported model does not reproduce fitted probabilities: "
                f"{exported_probability} vs {fitted_probability}."
            )

    arguments.output.parent.mkdir(parents=True, exist_ok=True)
    arguments.output.write_text(
        json.dumps(artifact, ensure_ascii=True, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )
    print(
        json.dumps(
            {
                "model_version": artifact["model_version"],
                "dataset": artifact["dataset"],
                "training_examples": len(training),
                "validation_examples": len(validation),
                "feature_count": len(features),
                "threshold": threshold,
                "standalone_threshold": standalone_threshold,
                "validation_metrics": validation_metrics,
                "standalone_validation_metrics": standalone_validation_metrics,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
