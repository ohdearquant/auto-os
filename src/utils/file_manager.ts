/**
 * Resource-aware file management
 * @module utils/file_manager
 */

import { ResourceManager } from "./resource_manager.ts";
import { Logger } from "./logger.ts";
import { Resource } from "../types/resource.ts";

export class FileManager {
    private readonly resourceManager: ResourceManager;
    private readonly openFiles = new Set<string>();
    private readonly logger: Logger;

    constructor(
        private readonly options = {
            maxOpenFiles: 100,
            cleanupInterval: 60000,  // 1 minute
            maxIdleTime: 300000      // 5 minutes
        }
    ) {
        this.resourceManager = new ResourceManager({
            cleanupInterval: options.cleanupInterval,
            maxIdleTime: options.maxIdleTime,
            gracefulTimeout: 5000
        });

        this.logger = new Logger({
            source: "FileManager",
            level: "info"
        });
    }

    /**
     * Managed file operations
     */
    public async withFile<T>(
        path: string,
        operation: (handle: Deno.FsFile) => Promise<T>,
        options: Deno.OpenOptions = {
            read: true,
            write: true,
            create: true
        }
    ): Promise<T> {
        const resourceId = `file-${path}`;
        
        try {
            if (this.openFiles.size >= this.options.maxOpenFiles) {
                throw new Error("Too many open files");
            }

            const file = await Deno.open(path, options);
            this.openFiles.add(path);
            
            await this.resourceManager.registerResource({
                id: resourceId,
                type: "file",
                lastUsed: Date.now(),
                handle: {
                    close: async () => {
                        file.close();
                        this.openFiles.delete(path);
                    }
                },
                metadata: {
                    path,
                    mode: options
                }
            });

            const result = await operation(file);
            await this.resourceManager.touchResource(resourceId);
            
            return result;
        } catch (error) {
            this.logger.error("File operation failed", {
                error,
                path
            });
            throw error;
        } finally {
            await this.resourceManager.releaseResource(resourceId);
        }
    }

    /**
     * Reads a file with resource management
     */
    public async readFile(
        path: string,
        options?: {
            encoding?: string;
            signal?: AbortSignal;
        }
    ): Promise<string> {
        return await this.withFile(
            path,
            async (file) => {
                const content = await file.readAll();
                return new TextDecoder(
                    options?.encoding ?? "utf-8"
                ).decode(content);
            },
            { read: true }
        );
    }

    /**
     * Writes to a file with resource management
     */
    public async writeFile(
        path: string,
        content: string | Uint8Array,
        options?: {
            encoding?: string;
            mode?: number;
            signal?: AbortSignal;
        }
    ): Promise<void> {
        const data = typeof content === "string"
            ? new TextEncoder().encode(content)
            : content;

        await this.withFile(
            path,
            async (file) => {
                await file.write(data);
                await file.sync();
            },
            {
                write: true,
                create: true,
                truncate: true
            }
        );
    }

    /**
     * Appends to a file with resource management
     */
    public async appendFile(
        path: string,
        content: string | Uint8Array,
        options?: {
            encoding?: string;
            mode?: number;
            signal?: AbortSignal;
        }
    ): Promise<void> {
        const data = typeof content === "string"
            ? new TextEncoder().encode(content)
            : content;

        await this.withFile(
            path,
            async (file) => {
                await file.seek(0, Deno.SeekMode.End);
                await file.write(data);
                await file.sync();
            },
            {
                write: true,
                create: true
            }
        );
    }

    /**
     * Gets file stats with resource management
     */
    public async stat(
        path: string
    ): Promise<Deno.FileInfo> {
        return await this.withFile(
            path,
            async (file) => file.stat(),
            { read: true }
        );
    }

    /**
     * Cleanup all open files
     */
    public async cleanup(): Promise<void> {
        await Promise.all(
            Array.from(this.openFiles)
                .map(path => 
                    this.resourceManager.releaseResource(
                        `file-${path}`
                    )
                )
        );
        this.openFiles.clear();
    }

    /**
     * Gets current file metrics
     */
    public getMetrics(): {
        openFiles: number;
        maxOpenFiles: number;
        paths: string[];
    } {
        return {
            openFiles: this.openFiles.size,
            maxOpenFiles: this.options.maxOpenFiles,
            paths: Array.from(this.openFiles)
        };
    }
}
