#!/usr/bin/env python3
"""Train the compact MeAJOR supporting classifier without exposing message text."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from scipy.sparse import hstack
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import normalize

from meajor_common import (
    DATASET_CSV_MD5,
    DATASET_DOI,
    DATASET_LICENSE,
    DATASET_VERSION,
    DEVELOPMENT_SOURCE,
    LOCKED_SOURCE,
    MAX_TEXT_CHARS,
    TRAIN_SOURCE,
    VALIDATION_SOURCE,
    binary_metrics,
    character_features,
    choose_threshold,
    choose_standalone_threshold,
    is_validation_group,
    load_examples,
    score_exported_model,
    tokenize,
    verify_dataset,
)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    arguments = parser.parse_args()

    verify_dataset(arguments.csv)
    examples, ingestion = load_examples(arguments.csv)
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

    word_vectorizer = TfidfVectorizer(
        tokenizer=tokenize,
        preprocessor=None,
        token_pattern=None,
        lowercase=False,
        ngram_range=(1, 1),
        min_df=4,
        max_df=0.995,
        max_features=30_000,
        sublinear_tf=True,
        norm=None,
        dtype=np.float64,
    )
    character_vectorizer = TfidfVectorizer(
        analyzer=character_features,
        lowercase=False,
        min_df=10,
        max_df=0.995,
        max_features=50_000,
        sublinear_tf=True,
        norm=None,
        dtype=np.float64,
    )
    training_texts = [item.text for item in training]
    validation_texts = [item.text for item in validation]
    training_matrix = normalize(hstack([
        word_vectorizer.fit_transform(training_texts),
        character_vectorizer.fit_transform(training_texts),
    ], format="csr"))
    validation_matrix = normalize(hstack([
        word_vectorizer.transform(validation_texts),
        character_vectorizer.transform(validation_texts),
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

    word_names = word_vectorizer.get_feature_names_out()
    character_names = character_vectorizer.get_feature_names_out()
    coefficients = classifier.coef_[0]
    word_idf = word_vectorizer.idf_
    character_idf = character_vectorizer.idf_
    features = [
        {
            "kind": kind,
            "term": str(term),
            "idf": round(float(term_idf), 8),
            "weight": round(float(weight), 8),
        }
        for kind, names, idf, weights in (
            (
                "word",
                word_names,
                word_idf,
                coefficients[:len(word_names)],
            ),
            (
                "character",
                character_names,
                character_idf,
                coefficients[len(word_names):],
            ),
        )
        for term, term_idf, weight in zip(names, idf, weights, strict=True)
    ]
    artifact = {
        "schema": "maillume-statistical-text-model-v1",
        "model_version": "meajor-logistic-v1",
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
            "normalization": "NFKD-strip-marks-lower-ascii-alnum",
            "features": "word-unigrams-and-bigrams-plus-character-3-to-5-grams",
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
    for index in sample_indexes:
        exported_probability = score_exported_model(artifact, validation[index].text)
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
