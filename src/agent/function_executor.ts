/**
 * Function execution system implementation
 * @module agent/function_executor
 */

import {
    FunctionDefinition,
    ToolDefinition,
    SecurityContext,
    ResourceLimits,
    ValidationError,
    ExecutionResult
} from "../types/mod.ts";
import { Sandbox } from "./sandbox.ts";
import { Logger } from "../utils/logger.ts";
import { validateData } from "../utils/validation.ts";

/**
 * Manages secure function and tool execution
 */
export class FunctionExecutor {
    private readonly sandbox: Sandbox;
    private readonly logger: Logger;

    constructor(
        private readonly security: SecurityContext,
        private readonly limits: ResourceLimits
    ) {
        this.sandbox = new Sandbox(security, limits);
        this.logger = new Logger({
            source: "FunctionExecutor",
            level: "info"
        });
    }

    /**
     * Executes a function in the sandbox
     */
    public async executeFunction<P = Record<string, unknown>>(
        func: FunctionDefinition<P>,
        params: P
    ): Promise<ExecutionResult> {
        const startTime = performance.now();
        
        try {
            await this.validateExecution(func, params);

            const result = await this.sandbox.execute(
                func.handler,
                params,
                func.permissions,
                this.limits
            );

            const executionTime = performance.now() - startTime;
            
            this.logger.debug("Function executed", {
                function: func.name,
                executionTime
            });

            return {
                success: true,
                result,
                metrics: {
                    executionTime,
                    memoryUsage: this.sandbox.getMemoryUsage()
                }
            };
        } catch (error) {
            this.logger.error("Function execution failed", {
                error,
                function: func.name
            });

            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                metrics: {
                    executionTime: performance.now() - startTime,
                    memoryUsage: this.sandbox.getMemoryUsage()
                }
            };
        }
    }

    /**
     * Executes a tool in the sandbox
     */
    public async executeTool<P = Record<string, unknown>>(
        tool: ToolDefinition<P>,
        params: P
    ): Promise<ExecutionResult> {
        const startTime = performance.now();
        
        try {
            await this.validateToolExecution(tool, params);

            const result = await this.sandbox.execute(
                tool.handler,
                params,
                tool.permissions,
                tool.limits ?? this.limits
            );

            const executionTime = performance.now() - startTime;
            
            this.logger.debug("Tool executed", {
                tool: tool.name,
                executionTime
            });

            return {
                success: true,
                result,
                metrics: {
                    executionTime,
                    memoryUsage: this.sandbox.getMemoryUsage()
                }
            };
        } catch (error) {
            this.logger.error("Tool execution failed", {
                error,
                tool: tool.name
            });

            return {
                success: false,
                error: error instanceof Error ? error : new Error(String(error)),
                metrics: {
                    executionTime: performance.now() - startTime,
                    memoryUsage: this.sandbox.getMemoryUsage()
                }
            };
        }
    }

    private async validateExecution<P>(
        func: FunctionDefinition<P>,
        params: P
    ): Promise<void> {
        await this.security.checkPermission(
            "execute_function",
            { function: func.name }
        );

        // Validate parameters against schema
        const valid = await validateData(params, func.parameters);
        
        if (!valid) {
            throw new ValidationError(
                "Invalid function parameters"
            );
        }
    }

    private async validateToolExecution<P>(
        tool: ToolDefinition<P>,
        params: P
    ): Promise<void> {
        await this.security.checkPermission(
            "execute_tool",
            { tool: tool.name }
        );

        // Validate parameters against schema
        const valid = await validateData(params, tool.parameters);
        
        if (!valid) {
            throw new ValidationError(
                "Invalid tool parameters"
            );
        }
    }
}
