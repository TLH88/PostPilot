"use client";

import { useState, useEffect } from "react";
import {
  getAvailableModels as getStaticModels,
  getDefaultModel as getStaticDefault,
  type AIProvider,
} from "./providers";

interface ModelEntry {
  value: string;
  label: string;
}

interface ProviderModels {
  models: ModelEntry[];
  defaultModel: string;
}

type ModelsMap = Record<string, ProviderModels>;

let cachedModels: ModelsMap | null = null;
let fetchPromise: Promise<ModelsMap> | null = null;

async function fetchModels(): Promise<ModelsMap> {
  if (cachedModels) return cachedModels;
  if (fetchPromise) return fetchPromise;

  fetchPromise = fetch("/api/models")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to fetch models");
      return res.json();
    })
    .then((data: ModelsMap) => {
      cachedModels = data;
      return data;
    })
    .catch(() => {
      // Return null on failure — hook will use static fallback
      fetchPromise = null;
      return null as unknown as ModelsMap;
    });

  return fetchPromise;
}

export function useModels() {
  const [models, setModels] = useState<ModelsMap | null>(cachedModels);

  useEffect(() => {
    fetchModels().then((data) => {
      if (data) setModels(data);
    });
  }, []);

  function getAvailableModels(provider: AIProvider): ModelEntry[] {
    if (models?.[provider]?.models?.length) {
      return models[provider].models;
    }
    return getStaticModels(provider);
  }

  function getDefaultModel(provider: AIProvider): string {
    if (models?.[provider]?.defaultModel) {
      return models[provider].defaultModel;
    }
    return getStaticDefault(provider);
  }

  return { getAvailableModels, getDefaultModel, loaded: models !== null };
}
