# Project Setup Guide

## 1. Project Structure

```typescript
const projectStructure = {
    root: "denoagents/",
    files: [
        "mod.ts",              // Main entry point
        "deno.json",           // Deno configuration
        "README.md",           // Project documentation
        ".gitignore",          // Git ignore file
        "LICENSE"              // License file
    ],
    directories: {
        src: {
            types: [           // Core type definitions
                "mod.ts",
                "agent.ts",
                "message.ts",
                "llm.ts",
                "security.ts",
                "error.ts"
            ],
            agent: [           // Agent implementations
                "mod.ts",
                "base.ts",
                "conversable.ts",
                "assistant.ts",
                "user_proxy.ts"
            ],
            chat: [            // Chat system
                "mod.ts",
                "message.ts",
                "router.ts",
                "history.ts",
                "group.ts"
            ],
            llm: [             // LLM integration
                "mod.ts",
                "provider.ts",
                "openai.ts",
                "azure.ts",
                "response.ts"
            ],
            utils: [           // Utility functions
                "mod.ts",
                "validation.ts",
                "security.ts",
                "async.ts",
                "logger.ts"
            ],
            test: [            // Test directory
                "mod_test.ts",
                "agent_test.ts",
                "chat_test.ts",
                "llm_test.ts"
            ]
        }
    }
};
```

## 2. Configuration Files

### 2.1 deno.json

```json
{
    "compilerOptions": {
        "strict": true,
        "allowJs": false,
        "lib": ["deno.window"],
        "noImplicitAny": true,
        "noImplicitReturns": true,
        "noUnusedLocals": true,
        "noUnusedParameters": true,
        "noFallthroughCasesInSwitch": true,
        "useUnknownInCatchVariables": true,
        "noUncheckedIndexedAccess": true
    },
    "lint": {
        "files": {
            "include": ["src/"]
        },
        "rules": {
            "tags": ["recommended"],
            "include": ["explicit-function-return-type"]
        }
    },
    "fmt": {
        "files": {
            "include": ["src/"]
        },
        "options": {
            "useTabs": false,
            "lineWidth": 80,
            "indentWidth": 4,
            "singleQuote": false
        }
    },
    "test": {
        "files": {
            "include": ["src/**/*_test.ts"]
        }
    }
}
```

## 3. Core Module Setup

### 3.1 mod.ts (Root)

```typescript
// Main entry point
export * from "./src/types/mod.ts";
export * from "./src/agent/mod.ts";
export * from "./src/chat/mod.ts";
export * from "./src/llm/mod.ts";
export * from "./src/utils/mod.ts";

// Version information
export const VERSION = "0.1.0";
```

### 3.2 Type Definitions

```typescript
// src/types/mod.ts
export * from "./agent.ts";
export * from "./message.ts";
export * from "./llm.ts";
export * from "./security.ts";
export * from "./error.ts";

// Type utilities
export type Awaitable<T> = T | Promise<T>;
export type Nullable<T> = T | null | undefined;
```

### 3.3 Module Exports

```typescript
// src/agent/mod.ts
export * from "./base.ts";
export * from "./conversable.ts";
export * from "./assistant.ts";
export * from "./user_proxy.ts";

// Agent types
export type AgentType = "base" | "conversable" | "assistant" | "user_proxy";

// src/chat/mod.ts
export * from "./message.ts";
export * from "./router.ts";
export * from "./history.ts";
export * from "./group.ts";

// Chat types
export type ChatType = "direct" | "group";

// src/llm/mod.ts
export * from "./provider.ts";
export * from "./openai.ts";
export * from "./azure.ts";
export * from "./response.ts";

// LLM types
export type ProviderType = "openai" | "azure" | "custom";
```

## 4. Development Scripts

```json
{
    "scripts": {
        "start": "deno run --allow-net mod.ts",
        "test": "deno test --allow-net",
        "check": "deno check **/*.ts",
        "fmt": "deno fmt",
        "lint": "deno lint",
        "docs": "deno doc --html --output=docs"
    }
}
```

## 5. Security Setup

```typescript
// src/utils/security.ts
export class SecurityContext {
    private permissions: Set<string> = new Set();

    constructor(
        private readonly scope: string,
        initialPermissions: string[] = []
    ) {
        initialPermissions.forEach(p => this.permissions.add(p));
    }

    async checkPermission(permission: string): Promise<boolean> {
        return this.permissions.has(permission);
    }
}
```

## Setup Instructions

1. **Initialize Project**
   ```bash
   # Create project structure
   mkdir -p denoagents/src/{types,agent,chat,llm,utils,test}
   
   # Copy configuration files
   cp deno.json .gitignore LICENSE README.md denoagents/
   ```

2. **Configure Version Control**
   ```bash
   # Initialize git repository
   git init
   git add .
   git commit -m "Initial commit: Project setup"
   ```

3. **Verify Setup**
   ```bash
   # Check types
   deno check mod.ts
   
   # Run tests
   deno test
   ```

## Best Practices

1. **Code Organization**
   - Follow modular structure
   - Maintain clear separation of concerns
   - Use consistent naming conventions

2. **Type Safety**
   - Enable strict type checking
   - Use explicit type annotations
   - Avoid type assertions

3. **Testing**
   - Write comprehensive tests
   - Follow test-driven development
   - Maintain high test coverage

4. **Documentation**
   - Document public APIs
   - Maintain clear examples
   - Keep documentation updated

5. **Security**
   - Follow security guidelines
   - Implement proper validation
   - Use secure defaults
