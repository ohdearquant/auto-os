/**
 * Function registry implementation
 * @module agent/function_registry
 */

import {
    FunctionDefinition,
    ToolDefinition,
    JSONSchema,
    SecurityContext,
    ValidationError
} from "../types/mod.ts";
import { Logger } from "../utils/logger.ts";
import { validateSchema } from "../utils/validation.ts";

/**
 * Manages function and tool registration and validation
 */
export class FunctionRegistry {
    private readonly functions = new Map<string, FunctionDefinition>();
    private readonly tools = new Map<string, ToolDefinition>();
    private readonly logger: Logger;

    constructor(
        private readonly security: SecurityContext,
        private readonly options: {
            maxFunctions?: number;
            maxTools?: number;
        } = {}
    ) {
        this.logger = new Logger({
            source: "FunctionRegistry",
            level: "info"
        });
    }

    /**
     * Registers a new function
     * @throws ValidationError if function is invalid
     */
    public async registerFunction(
        func: FunctionDefinition
    ): Promise<void> {
        try {
            await this.validateFunction(func);
            
            if (this.isAtFunctionLimit()) {
                throw new ValidationError("Function limit reached");
            }

            this.functions.set(func.name, func);
            
            this.logger.info("Registered function", {
                name: func.name
            });
        } catch (error) {
            this.logger.error("Function registration failed", {
                error,
                function: func.name
            });
            throw error;
        }
    }

    /**
     * Registers a new tool
     * @throws ValidationError if tool is invalid
     */
    public async registerTool(
        tool: ToolDefinition
    ): Promise<void> {
        try {
            await this.validateTool(tool);
            
            if (this.isAtToolLimit()) {
                throw new ValidationError("Tool limit reached");
            }

            this.tools.set(tool.name, tool);
            
            this.logger.info("Registered tool", {
                name: tool.name
            });
        } catch (error) {
            this.logger.error("Tool registration failed", {
                error,
                tool: tool.name
            });
            throw error;
        }
    }

    /**
     * Retrieves a registered function
     */
    public getFunction(name: string): FunctionDefinition {
        const func = this.functions.get(name);
        if (!func) {
            throw new ValidationError(`Function not found: ${name}`);
        }
        return func;
    }

    /**
     * Retrieves a registered tool
     */
    public getTool(name: string): ToolDefinition {
        const tool = this.tools.get(name);
        if (!tool) {
            throw new ValidationError(`Tool not found: ${name}`);
        }
        return tool;
    }

    private async validateFunction(
        func: FunctionDefinition
    ): Promise<void> {
        if (!func.name || !func.description) {
            throw new ValidationError(
                "Function must have name and description"
            );
        }

        await validateSchema(func.parameters);
        await validateSchema(func.returns);
        
        if (this.functions.has(func.name)) {
            throw new ValidationError(
                `Function already registered: ${func.name}`
            );
        }

        await this.security.checkPermission(
            "register_function",
            { function: func.name }
        );
    }

    private async validateTool(
        tool: ToolDefinition
    ): Promise<void> {
        if (!tool.name || !tool.description) {
            throw new ValidationError(
                "Tool must have name and description"
            );
        }

        await validateSchema(tool.parameters);
        
        if (this.tools.has(tool.name)) {
            throw new ValidationError(
                `Tool already registered: ${tool.name}`
            );
        }

        await this.security.checkPermission(
            "register_tool",
            { tool: tool.name }
        );
    }

    private isAtFunctionLimit(): boolean {
        return this.options.maxFunctions !== undefined &&
            this.functions.size >= this.options.maxFunctions;
    }

    private isAtToolLimit(): boolean {
        return this.options.maxTools !== undefined &&
            this.tools.size >= this.options.maxTools;
    }
}
