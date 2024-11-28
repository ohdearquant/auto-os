export interface RuntimeDependency {
  version: string;
  features: string[];
}

export interface ExternalAPI {
  required: boolean;
  version: string;
  features: string[];
  fallback: boolean;
  extensible?: boolean;
  interface?: string;
}

export interface PerformanceLimits {
  maxConcurrentChats: number;
  maxMessageHistory: number;
  maxTokensPerRequest: number;
  responseTimeLimit: number;
  memoryUsageLimit: string;
  rateLimits: {
    openai: string;
    azure: string;
    custom: string;
  };
}

export interface ResourceConstraints {
  memory: {
    baseline: string;
    peak: string;
    cleanup_threshold: string;
  };
  storage: {
    chat_history: string;
    cache: string;
    persistence: string;
  };
  network: {
    bandwidth: string;
    latency: string;
    timeout: string;
  };
}

export interface APIConstraints {
  rate_limiting: {
    openai: {
      free_tier: string;
      paid_tier: string;
    };
    azure: string;
    custom: string;
  };
  availability: {
    required: string;
    fallback: string;
    recovery: string;
  };
  cost: {
    token_based: boolean;
    variable_pricing: boolean;
    budget_controls: string;
  };
}

export interface SecurityRequirements {
  permissions: string[];
  authentication: {
    api_keys: string;
    token_management: string;
    access_control: string;
  };
  data_handling: {
    encryption: string;
    sanitization: string;
    validation: string;
  };
}

export interface CodeRequirements {
  typescript: {
    strict: boolean;
    noImplicitAny: boolean;
    noUncheckedIndexedAccess: boolean;
  };
  testing: {
    coverage: string;
    unit_tests: string;
    integration_tests: string;
    performance_tests: string;
  };
  documentation: {
    api_docs: string;
    examples: string;
    type_definitions: string;
  };
}

export interface ArchitecturalConstraints {
  modularity: {
    required: boolean;
    coupling: string;
    cohesion: string;
  };
  extensibility: {
    plugin_system: string;
    custom_agents: string;
    provider_integration: string;
  };
  compatibility: {
    ag2: string;
    deno_std: string;
    esm: string;
  };
}

export const REQUIRED_RUNTIME: Record<string, RuntimeDependency> = {
  deno: {
    version: ">=1.37.0",
    features: [
      "async/await",
      "permissions API",
      "TypeScript support",
      "ESM modules",
    ],
  },
  typescript: {
    version: ">=5.0.0",
    features: [
      "strict mode",
      "type checking",
      "decorators",
    ],
  },
};

export const EXTERNAL_APIS: Record<string, ExternalAPI> = {
  openai: {
    required: true,
    version: ">=1.0.0",
    features: ["chat completions", "embeddings"],
    fallback: false,
  },
  azure_openai: {
    required: false,
    version: "latest",
    features: ["OpenAI API compatibility"],
    fallback: true,
  },
  other_llm_providers: {
    required: false,
    version: "provider-dependent",
    extensible: true,
    features: [],
    fallback: false,
    interface: "LLMProviderInterface",
  },
};

export const PERFORMANCE_LIMITS: PerformanceLimits = {
  maxConcurrentChats: 100,
  maxMessageHistory: 1000,
  maxTokensPerRequest: 4096,
  responseTimeLimit: 200,
  memoryUsageLimit: "256MB",
  rateLimits: {
    openai: "3500 tokens/min",
    azure: "customizable",
    custom: "provider-specific",
  },
};

export const RESOURCE_CONSTRAINTS: ResourceConstraints = {
  memory: {
    baseline: "64MB",
    peak: "256MB",
    cleanup_threshold: "200MB",
  },
  storage: {
    chat_history: "configurable",
    cache: "temporary",
    persistence: "optional",
  },
  network: {
    bandwidth: "dependent on LLM usage",
    latency: "provider-dependent",
    timeout: "configurable",
  },
};

export const API_CONSTRAINTS: APIConstraints = {
  rate_limiting: {
    openai: {
      free_tier: "3 requests/min",
      paid_tier: "variable based on plan",
    },
    azure: "subscription-based",
    custom: "implementation-dependent",
  },
  availability: {
    required: "99.9% uptime",
    fallback: "required for critical operations",
    recovery: "automatic retry with backoff",
  },
  cost: {
    token_based: true,
    variable_pricing: true,
    budget_controls: "required",
  },
};

export const SECURITY_REQUIREMENTS: SecurityRequirements = {
  permissions: [
    "net_access",
    "env_access",
    "file_system_access",
  ],
  authentication: {
    api_keys: "secure storage required",
    token_management: "rotation support",
    access_control: "granular permissions",
  },
  data_handling: {
    encryption: "required for sensitive data",
    sanitization: "required for all inputs",
    validation: "strict type checking",
  },
};

export const CODE_REQUIREMENTS: CodeRequirements = {
  typescript: {
    strict: true,
    noImplicitAny: true,
    noUncheckedIndexedAccess: true,
  },
  testing: {
    coverage: ">=80%",
    unit_tests: "required",
    integration_tests: "required",
    performance_tests: "required",
  },
  documentation: {
    api_docs: "100% coverage",
    examples: "required",
    type_definitions: "complete",
  },
};

export const ARCHITECTURAL_CONSTRAINTS: ArchitecturalConstraints = {
  modularity: {
    required: true,
    coupling: "loose",
    cohesion: "high",
  },
  extensibility: {
    plugin_system: "required",
    custom_agents: "supported",
    provider_integration: "standardized",
  },
  compatibility: {
    ag2: "required",
    deno_std: "required",
    esm: "required",
  },
};
