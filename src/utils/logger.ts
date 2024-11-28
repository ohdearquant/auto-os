/**
 * Logger implementation
 * @module utils/logger
 */

/**
 * Log levels
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Logger configuration
 */
export interface LoggerConfig {
    /** Source identifier */
    source: string;
    /** Minimum log level */
    level: LogLevel;
    /** Optional custom formatter */
    formatter?: (level: LogLevel, message: string, data?: unknown) => string;
}

/**
 * Simple logger implementation
 */
export class Logger {
    private readonly levelValue: Map<LogLevel, number>;

    constructor(private readonly config: LoggerConfig) {
        this.levelValue = new Map([
            ["debug", 0],
            ["info", 1],
            ["warn", 2],
            ["error", 3]
        ]);
    }

    /**
     * Log debug message
     */
    public debug(message: string, data?: unknown): void {
        this.log("debug", message, data);
    }

    /**
     * Log info message
     */
    public info(message: string, data?: unknown): void {
        this.log("info", message, data);
    }

    /**
     * Log warning message
     */
    public warn(message: string, data?: unknown): void {
        this.log("warn", message, data);
    }

    /**
     * Log error message
     */
    public error(message: string, data?: unknown): void {
        this.log("error", message, data);
    }

    /**
     * Internal logging implementation
     */
    private log(level: LogLevel, message: string, data?: unknown): void {
        if (this.shouldLog(level)) {
            const formattedMessage = this.formatMessage(level, message, data);
            this.writeLog(level, formattedMessage);
        }
    }

    /**
     * Check if message should be logged based on level
     */
    private shouldLog(level: LogLevel): boolean {
        const configLevel = this.levelValue.get(this.config.level) ?? 0;
        const messageLevel = this.levelValue.get(level) ?? 0;
        return messageLevel >= configLevel;
    }

    /**
     * Format log message
     */
    private formatMessage(
        level: LogLevel,
        message: string,
        data?: unknown
    ): string {
        if (this.config.formatter) {
            return this.config.formatter(level, message, data);
        }

        const timestamp = new Date().toISOString();
        const source = this.config.source;
        const dataString = data ? ` ${JSON.stringify(data)}` : "";

        return `[${timestamp}] ${level.toUpperCase()} [${source}] ${message}${dataString}`;
    }

    /**
     * Write log message to output
     */
    private writeLog(level: LogLevel, message: string): void {
        switch (level) {
            case "error":
                console.error(message);
                break;
            case "warn":
                console.warn(message);
                break;
            case "info":
                console.info(message);
                break;
            case "debug":
            default:
                console.debug(message);
                break;
        }
    }
}
