/**
 * Validation utilities
 * @module utils/validation
 */

import { Message, FunctionDefinition, ValidationError } from "../types/mod.ts";

/**
 * Validates message structure and content
 * @throws ValidationError if message is invalid
 */
export async function validateMessage(message: Message): Promise<void> {
    if (!message.id) {
        throw new ValidationError("Message must have an id");
    }
    
    if (!message.role) {
        throw new ValidationError("Message must have a role");
    }
    
    if (!message.metadata) {
        throw new ValidationError("Message must have metadata");
    }
    
    if (!message.metadata.senderId) {
        throw new ValidationError("Message must have a sender id");
    }
    
    if (!message.metadata.recipientId) {
        throw new ValidationError("Message must have a recipient id");
    }
    
    if (!message.metadata.conversationId) {
        throw new ValidationError("Message must have a conversation id");
    }
    
    if (message.functionCall) {
        await validateFunctionCall(message.functionCall);
    }
}

/**
 * Validates function definition
 * @throws ValidationError if function definition is invalid
 */
export function validateFunction(func: FunctionDefinition): void {
    if (!func.name) {
        throw new ValidationError("Function must have a name");
    }
    
    if (!func.description) {
        throw new ValidationError("Function must have a description");
    }
    
    if (!func.parameters) {
        throw new ValidationError("Function must have parameters schema");
    }
    
    if (!func.returns) {
        throw new ValidationError("Function must have returns schema");
    }
    
    if (typeof func.handler !== "function") {
        throw new ValidationError("Function must have a handler");
    }
}

/**
 * Validates function call
 * @throws ValidationError if function call is invalid
 */
export async function validateFunctionCall(
    functionCall: { name: string; arguments: string }
): Promise<void> {
    if (!functionCall.name) {
        throw new ValidationError("Function call must have a name");
    }
    
    try {
        JSON.parse(functionCall.arguments);
    } catch (error) {
        throw new ValidationError(
            "Function arguments must be valid JSON",
            { originalError: error }
        );
    }
}
