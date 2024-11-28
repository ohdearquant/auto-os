/**
 * Integration test orchestrator
 * @module test/integration/orchestrator
 */

import { Logger } from "../../utils/logger.ts";
import { TestResult, TestStatus } from "../types.ts";

export class TestOrchestrator {
    private readonly logger: Logger;
    private results: TestResult[] = [];

    constructor() {
        this.logger = new Logger({
            source: "IntegrationTest",
            level: "debug"
        });
    }

    /**
     * Runs integration tests in sequence
     */
    public async runTests(
        tests: Array<() => Promise<void>>
    ): Promise<TestResult[]> {
        for (const test of tests) {
            const result = await this.runTest(test);
            this.results.push(result);
            
            if (result.status === "failed" && 
                result.blocking) {
                this.logger.error(
                    "Blocking test failed, stopping execution",
                    result
                );
                break;
            }
        }
        return this.results;
    }

    /**
     * Gets test execution metrics
     */
    public getMetrics(): {
        passed: number;
        failed: number;
        skipped: number;
        totalDuration: number;
        averageDuration: number;
    } {
        const passed = this.results.filter(
            r => r.status === "passed"
        ).length;
        const failed = this.results.filter(
            r => r.status === "failed"
        ).length;
        const skipped = this.results.filter(
            r => r.status === "skipped"
        ).length;
        const totalDuration = this.results.reduce(
            (sum, r) => sum + r.duration,
            0
        );

        return {
            passed,
            failed,
            skipped,
            totalDuration,
            averageDuration: totalDuration / this.results.length
        };
    }

    private async runTest(
        test: () => Promise<void>
    ): Promise<TestResult> {
        const start = performance.now();
        try {
            await test();
            const duration = performance.now() - start;
            
            this.logger.debug("Test passed", {
                duration
            });

            return {
                status: "passed",
                duration
            };
        } catch (error) {
            const duration = performance.now() - start;
            
            this.logger.error("Test failed", {
                error,
                duration
            });

            return {
                status: "failed",
                error,
                duration,
                blocking: this.isBlockingError(error)
            };
        }
    }

    private isBlockingError(error: unknown): boolean {
        if (!(error instanceof Error)) {
            return false;
        }

        const blockingPatterns = [
            /initialization/i,
            /critical/i,
            /security violation/i,
            /system failure/i,
            /resource exhausted/i
        ];

        return blockingPatterns.some(pattern => 
            pattern.test(error.message)
        );
    }

    /**
     * Resets test results
     */
    public reset(): void {
        this.results = [];
    }

    /**
     * Gets detailed test results
     */
    public getResults(): readonly TestResult[] {
        return [...this.results];
    }
}
