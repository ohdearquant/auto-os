/**
 * Test type definitions
 * @module test/types
 */

export type TestStatus = "passed" | "failed" | "skipped";

export interface TestResult {
    status: TestStatus;
    duration: number;
    error?: unknown;
    blocking?: boolean;
    metadata?: Record<string, unknown>;
}

export interface TestMetrics {
    passed: number;
    failed: number;
    skipped: number;
    totalDuration: number;
    averageDuration: number;
}

export interface TestSuite {
    name: string;
    tests: Array<() => Promise<void>>;
    setup?: () => Promise<void>;
    teardown?: () => Promise<void>;
    metadata?: Record<string, unknown>;
}
