/**
 * Resource-related type definitions
 * @module types/resource
 */

export type ResourceType = "connection" | "file" | "memory";

export interface Resource {
    id: string;
    type: ResourceType;
    lastUsed: number;
    connection?: {
        close: () => Promise<void>;
    };
    handle?: {
        close: () => Promise<void>;
    };
    buffer?: unknown | null;
    metadata?: Record<string, unknown>;
}

export type CleanupStrategy = (
    resource: Resource
) => Promise<void>;

export interface ResourceMetrics {
    totalResources: number;
    byType: Record<ResourceType, number>;
    averageIdleTime: number;
    cleanupAttempts: number;
    cleanupSuccesses: number;
    cleanupFailures: number;
}

export interface ResourceManagerOptions {
    cleanupInterval: number;  // milliseconds
    maxIdleTime: number;     // milliseconds
    gracefulTimeout: number; // milliseconds
    maxRetries?: number;     // cleanup retry attempts
    retryDelay?: number;     // milliseconds between retries
}

export interface ResourceHandle<T> {
    resource: Resource;
    value: T;
    release: () => Promise<void>;
}

export interface ResourcePool<T> {
    acquire: () => Promise<ResourceHandle<T>>;
    release: (handle: ResourceHandle<T>) => Promise<void>;
    clear: () => Promise<void>;
    size: () => number;
}
