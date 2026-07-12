# -*- coding: utf-8 -*-
"""
Predictive Intelligence & Analysis Platform (PIAP)
Core Machine Learning and Deep Learning Models Implementation

This file implements actual document classification pipelines using:
1. scikit-learn (TfidfVectorizer, RandomForestClassifier, LogisticRegression)
2. xgboost (XGBClassifier)
3. PyTorch & HuggingFace Transformers (DistilBERT / MiniLM)
4. TensorFlow (Keras feed-forward neural networks)
"""

import os
import numpy as np

# -----------------------------------------------------------------------------
# 1. SCIKIT-LEARN IMPORTS & MODEL IMPLEMENTATION
# -----------------------------------------------------------------------------
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, precision_recall_fscore_support

class ScikitLearnClassifierPipeline:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(max_features=1000, stop_words='english')
        self.rf_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.lr_model = LogisticRegression(solver='liblinear', random_state=42)
        self.is_trained = False

    def train(self, texts, labels):
        """
        Fits the TF-IDF Vectorizer and trains RandomForest and LogisticRegression models.
        """
        X = self.vectorizer.fit_transform(texts)
        self.rf_model.fit(X, labels)
        self.lr_model.fit(X, labels)
        self.is_trained = True

    def predict(self, text):
        """
        Performs dual-classifier prediction on incoming text.
        """
        if not self.is_trained:
            raise ValueError("Models must be trained before predicting.")
        
        X = self.vectorizer.transform([text])
        rf_pred = self.rf_model.predict(X)[0]
        lr_prob = self.lr_model.predict_proba(X)[0]
        
        return {
            "random_forest_prediction": int(rf_pred),
            "logistic_regression_probabilities": lr_prob.tolist(),
            "logistic_regression_prediction": int(np.argmax(lr_prob))
        }


# -----------------------------------------------------------------------------
# 2. XGBOOST IMPORTS & MODEL IMPLEMENTATION
# -----------------------------------------------------------------------------
import xgboost as xgb

class XGBoostThreatClassifier:
    def __init__(self):
        self.model = xgb.XGBClassifier(
            n_estimators=50,
            max_depth=5,
            learning_rate=0.1,
            use_label_encoder=False,
            eval_metric='logloss'
        )
        self.vectorizer = TfidfVectorizer(max_features=500, stop_words='english')
        self.is_trained = False

    def train(self, texts, labels):
        X = self.vectorizer.fit_transform(texts)
        self.model.fit(X, labels)
        self.is_trained = True

    def predict(self, text):
        if not self.is_trained:
            raise ValueError("XGBoost model is not trained.")
        X = self.vectorizer.transform([text])
        prob = self.model.predict_proba(X)[0]
        pred = self.model.predict(X)[0]
        return {
            "xgboost_prediction": int(pred),
            "xgboost_probabilities": prob.tolist()
        }


# -----------------------------------------------------------------------------
# 3. PYTORCH & HUGGINGFACE TRANSFORMERS (DistilBERT / MiniLM)
# -----------------------------------------------------------------------------
import torch
import torch.nn as nn
from transformers import AutoTokenizer, AutoModelForSequenceClassification

class PyTorchTransformerClassifier:
    def __init__(self, model_name="distilbert-base-uncased"):
        self.model_name = model_name
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        # 4 Class output: Supply Chain, Critical Infrastructure, Edge Network, Identity
        self.model = AutoModelForSequenceClassification.from_pretrained(model_name, num_labels=4).to(self.device)

    def predict(self, text):
        """
        Tokenizes text and passes it through DistilBERT/MiniLM for deep semantic analysis.
        """
        inputs = self.tokenizer(text, return_tensors="pt", truncation=True, max_length=512, padding=True)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}
        
        with torch.no_grad():
            outputs = self.model(**inputs)
            logits = outputs.logits
            probabilities = torch.softmax(logits, dim=-1).cpu().numpy()[0]
            prediction = torch.argmax(logits, dim=-1).cpu().item()
            
        return {
            "pytorch_prediction": int(prediction),
            "pytorch_probabilities": probabilities.tolist()
        }


# -----------------------------------------------------------------------------
# 4. TENSORFLOW (Keras Feed-Forward Semantic Predictor)
# -----------------------------------------------------------------------------
import tensorflow as tf
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import Dense, Dropout

class TensorFlowThreatClassifier:
    def __init__(self, input_dim=1000):
        self.input_dim = input_dim
        self.model = self._build_model()

    def _build_model(self):
        model = Sequential([
            Dense(128, activation='relu', input_shape=(self.input_dim,)),
            Dropout(0.3),
            Dense(64, activation='relu'),
            Dense(4, activation='softmax') # 4 classes
        ])
        model.compile(optimizer='adam', loss='sparse_categorical_crossentropy', metrics=['accuracy'])
        return model

    def train(self, X_train, y_train, epochs=5, batch_size=16):
        self.model.fit(X_train, y_train, epochs=epochs, batch_size=batch_size, verbose=0)

    def predict(self, X_vector):
        preds = self.model.predict(np.array([X_vector]), verbose=0)[0]
        return {
            "tensorflow_prediction": int(np.argmax(preds)),
            "tensorflow_probabilities": preds.tolist()
        }
