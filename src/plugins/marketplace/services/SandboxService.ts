import { VM, VMScript } from 'vm2';
import { Plugin, PluginVersion } from '../models/PluginModel';

/**
 * Sandbox execution result
 */
export interface SandboxResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
  memoryUsage: number;
}

/**
 * Sandbox execution options
 */
export interface SandboxOptions {
  timeout?: number;
  memoryLimit?: number;
  allowedModules?: string[];
  context?: Record<string, any>;
}

/**
 * Service for sandboxed plugin execution
 */
export class SandboxService {
  private defaultOptions: SandboxOptions = {
    timeout: 5000, // 5 seconds
    memoryLimit: 50 * 1024 * 1024, // 50 MB
    allowedModules: ['lodash', 'moment', 'mathjs'],
    context: {}
  };
  
  /**
   * Execute plugin code in a sandbox
   */
  async executePlugin(
    plugin: Plugin,
    version: PluginVersion,
    code: string,
    input: any,
    options?: SandboxOptions
  ): Promise<SandboxResult> {
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;
    
    const mergedOptions = { ...this.defaultOptions, ...options };
    
    try {
      // Create sandbox
      const vm = new VM({
        timeout: mergedOptions.timeout,
        sandbox: {
          console: {
            log: (...args: any[]) => console.log(`[Plugin ${plugin.id}]`, ...args),
            error: (...args: any[]) => console.error(`[Plugin ${plugin.id}]`, ...args),
            warn: (...args: any[]) => console.warn(`[Plugin ${plugin.id}]`, ...args),
            info: (...args: any[]) => console.info(`[Plugin ${plugin.id}]`, ...args),
          },
          input,
          ...mergedOptions.context
        },
        require: {
          external: true,
          builtin: ['path', 'crypto', 'util'],
          root: './',
          mock: {
            fs: {
              readFileSync: () => { throw new Error('File system access is not allowed'); },
              writeFileSync: () => { throw new Error('File system access is not allowed'); },
              readdirSync: () => { throw new Error('File system access is not allowed'); },
              existsSync: () => { throw new Error('File system access is not allowed'); },
            },
            child_process: {
              exec: () => { throw new Error('Process execution is not allowed'); },
              spawn: () => { throw new Error('Process execution is not allowed'); },
              execSync: () => { throw new Error('Process execution is not allowed'); },
            },
            http: {
              request: () => { throw new Error('Network access is not allowed'); },
              get: () => { throw new Error('Network access is not allowed'); },
            },
            https: {
              request: () => { throw new Error('Network access is not allowed'); },
              get: () => { throw new Error('Network access is not allowed'); },
            },
            net: {
              connect: () => { throw new Error('Network access is not allowed'); },
              createServer: () => { throw new Error('Network access is not allowed'); },
            }
          }
        }
      });
      
      // Wrap code in a function that returns a result
      const wrappedCode = `
        (function() {
          try {
            ${code}
            
            // If the plugin defines a main function, call it with the input
            if (typeof main === 'function') {
              return main(input);
            }
            
            // Otherwise, return any exported values
            return { exports: module.exports };
          } catch (error) {
            return { error: error.message, stack: error.stack };
          }
        })();
      `;
      
      // Compile script
      const script = new VMScript(wrappedCode);
      
      // Run script
      const result = vm.run(script);
      
      // Check for error in result
      if (result && result.error) {
        throw new Error(result.error);
      }
      
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      return {
        success: true,
        result,
        executionTime: endTime - startTime,
        memoryUsage: endMemory - startMemory
      };
    } catch (error) {
      const endTime = Date.now();
      const endMemory = process.memoryUsage().heapUsed;
      
      return {
        success: false,
        error: (error as Error).message,
        executionTime: endTime - startTime,
        memoryUsage: endMemory - startMemory
      };
    }
  }
  
  /**
   * Validate plugin code without executing it
   */
  async validatePlugin(code: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Create sandbox with minimal permissions
      const vm = new VM({
        timeout: 1000,
        sandbox: {},
        require: {
          external: false,
          builtin: [],
          root: './',
        }
      });
      
      // Try to compile the code
      const script = new VMScript(code);
      
      // If it compiles, it's valid
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: (error as Error).message
      };
    }
  }
  
  /**
   * Extract plugin metadata from code
   */
  async extractPluginMetadata(code: string): Promise<Record<string, any> | null> {
    try {
      // Create sandbox
      const vm = new VM({
        timeout: 1000,
        sandbox: {},
        require: {
          external: false,
          builtin: [],
          root: './',
        }
      });
      
      // Wrap code to extract metadata
      const wrappedCode = `
        (function() {
          try {
            ${code}
            
            // Look for metadata in module.exports
            if (module.exports && module.exports.metadata) {
              return module.exports.metadata;
            }
            
            // Look for a getMetadata function
            if (typeof getMetadata === 'function') {
              return getMetadata();
            }
            
            // Look for a metadata object
            if (typeof metadata === 'object') {
              return metadata;
            }
            
            return null;
          } catch (error) {
            return null;
          }
        })();
      `;
      
      // Compile and run script
      const script = new VMScript(wrappedCode);
      const metadata = vm.run(script);
      
      return metadata;
    } catch (error) {
      console.error('Failed to extract plugin metadata:', error);
      return null;
    }
  }
  
  /**
   * Test plugin with sample data
   */
  async testPlugin(
    plugin: Plugin,
    version: PluginVersion,
    code: string,
    sampleData: any[]
  ): Promise<{ success: boolean; results: SandboxResult[]; summary: string }> {
    const results: SandboxResult[] = [];
    let successCount = 0;
    
    for (let i = 0; i < sampleData.length; i++) {
      const result = await this.executePlugin(plugin, version, code, sampleData[i]);
      results.push(result);
      
      if (result.success) {
        successCount++;
      }
    }
    
    const successRate = (successCount / sampleData.length) * 100;
    const avgExecutionTime = results.reduce((sum, r) => sum + r.executionTime, 0) / results.length;
    const avgMemoryUsage = results.reduce((sum, r) => sum + r.memoryUsage, 0) / results.length;
    
    const summary = `
      Test Summary:
      - Success Rate: ${successRate.toFixed(2)}%
      - Average Execution Time: ${avgExecutionTime.toFixed(2)}ms
      - Average Memory Usage: ${(avgMemoryUsage / (1024 * 1024)).toFixed(2)}MB
    `;
    
    return {
      success: successCount === sampleData.length,
      results,
      summary
    };
  }
}