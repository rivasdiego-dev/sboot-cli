import fs from 'fs-extra';
import path from 'path';
import { ModuleScanner } from './ModuleScanner.js';
import { Logger } from '../../utils/Logger.js';
import { PathResolver } from '../../utils/PathResolver.js';

export class ProjectScanner {
    constructor() {
        this.moduleScanner = new ModuleScanner();
        this.logger = new Logger();
        this.pathResolver = new PathResolver();
    }

    async scan() {
        try {
            this.logger.info('Starting project scan...');
            
            const sourcePath = this.pathResolver.findJavaSourcePath();
            this.logger.debug('Found source path:', sourcePath);

            const projectStructure = {
                basePackage: await this.findBasePackage(sourcePath),
                sourcePath: sourcePath,
                modules: [],
                timestamp: new Date().toISOString()
            };

            this.logger.debug('Base package:', projectStructure.basePackage);
            
            const basePackagePath = this.getBasePackagePath(sourcePath, projectStructure.basePackage);
            this.logger.debug('Base package path:', basePackagePath);

            const modulePaths = await this.findModules(basePackagePath);
            this.logger.debug('Found modules:', modulePaths);

            for (const modulePath of modulePaths) {
                const moduleStructure = await this.moduleScanner.scan(modulePath);
                if (moduleStructure) {
                    projectStructure.modules.push(moduleStructure);
                }
            }

            this.logger.success('Project scan completed successfully');
            return projectStructure;

        } catch (error) {
            this.logger.error('Error scanning project:', error);
            throw error;
        }
    }

    async findBasePackage(sourcePath) {
        try {
            // Look for Application.java or similar main class
            const mainClass = await this.findMainClass(sourcePath);
            if (!mainClass) {
                throw new Error('Could not find Spring Boot main class');
            }

            return this.extractBasePackage(mainClass, sourcePath);
        } catch (error) {
            throw new Error(`Error finding base package: ${error.message}`);
        }
    }

    async findMainClass(startPath) {
        try {
            const files = await fs.readdir(startPath, { withFileTypes: true });
            
            for (const file of files) {
                const fullPath = path.join(startPath, file.name);
                
                if (file.isDirectory()) {
                    const result = await this.findMainClass(fullPath);
                    if (result) return result;
                } else if (file.name.endsWith('Application.java')) {
                    const content = await fs.readFile(fullPath, 'utf-8');
                    if (content.includes('@SpringBootApplication')) {
                        return fullPath;
                    }
                }
            }
            return null;
        } catch (error) {
            this.logger.error(`Error searching for main class in ${startPath}:`, error);
            return null;
        }
    }

    getBasePackagePath(sourcePath, basePackage) {
        // Convert package notation (com.example) to path (com/example)
        const packagePath = basePackage.replace(/\./g, path.sep);
        return path.join(sourcePath, packagePath);
    }

    async findModules(basePath) {
        try {
            const entries = await fs.readdir(basePath, { withFileTypes: true });
            
            const modulePaths = [];
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    const modulePath = path.join(basePath, entry.name);
                    if (await this.isValidModule(modulePath)) {
                        modulePaths.push(modulePath);
                    }
                }
            }
            
            return modulePaths;
        } catch (error) {
            this.logger.error(`Error finding modules in ${basePath}:`, error);
            return [];
        }
    }

    async isValidModule(modulePath) {
        try {
            const contents = await fs.readdir(modulePath);
            const hasCleanArchStructure = contents.some(item => 
                ['application', 'domain', 'infrastructure'].includes(item.toLowerCase())
            );
            
            return hasCleanArchStructure;
        } catch (error) {
            this.logger.error(`Error checking module structure in ${modulePath}:`, error);
            return false;
        }
    }

    extractBasePackage(mainClassPath, sourcePath) {
        // Get the relative path from source directory to the main class directory
        const relativePath = path.relative(sourcePath, path.dirname(mainClassPath));
        // Convert path separators to dots for package name
        return relativePath.split(path.sep).join('.');
    }
}