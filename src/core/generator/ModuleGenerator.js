import fs from 'fs-extra';
import path from 'path';
import { Logger } from '../../utils/Logger.js';

export class ModuleGenerator {
    constructor(projectStructure, config) {
        this.projectStructure = projectStructure;
        this.config = config;
        this.logger = new Logger();
    }

    async generate(moduleName, verbose = false) {
        const createdPaths = [];
        const moduleBasePath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName
        );

        if (verbose) {
            this.logger.info(`Creating module at: ${moduleBasePath}`);
        }

        // Create module base directory
        await fs.ensureDir(moduleBasePath);
        createdPaths.push(moduleBasePath);

        // Create layer structure based on configuration
        for (const [layerName, layerConfig] of Object.entries(this.config.moduleStructure.layers)) {
            if (layerConfig.enabled) {
                const layerPath = path.join(moduleBasePath, layerName);
                await fs.ensureDir(layerPath);
                createdPaths.push(layerPath);

                if (verbose) {
                    this.logger.info(`Creating ${layerName} layer`);
                }

                // Create configured folders for the layer
                for (const folder of layerConfig.folders) {
                    const folderPath = path.join(layerPath, folder);
                    await fs.ensureDir(folderPath);
                    createdPaths.push(folderPath);

                    if (verbose) {
                        this.logger.info(`Creating folder: ${folder}`);
                    }

                    // Create implementations folder for services and mappers if needed
                    if (['services', 'mappers'].includes(folder)) {
                        const implPath = path.join(folderPath, 'implementations');
                        await fs.ensureDir(implPath);
                        createdPaths.push(implPath);
                    }
                }
            }
        }

        return {
            moduleName,
            basePath: moduleBasePath,
            createdPaths
        };
    }
}