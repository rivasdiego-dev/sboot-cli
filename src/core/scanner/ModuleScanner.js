import fs from 'fs-extra';
import path from 'path';
import { ResourceScanner } from './ResourceScanner.js';

export class ModuleScanner {
    constructor() {
        this.resourceScanner = new ResourceScanner();
    }

    async scan(modulePath) {
        try {
            const moduleName = path.basename(modulePath);
            
            const structure = {
                name: moduleName,
                path: modulePath,
                layers: {
                    application: await this.scanLayer(path.join(modulePath, 'application')),
                    domain: await this.scanLayer(path.join(modulePath, 'domain')),
                    infrastructure: await this.scanLayer(path.join(modulePath, 'infrastructure'))
                }
            };

            // Scan for resources in each layer
            for (const layer of Object.keys(structure.layers)) {
                if (structure.layers[layer]) {
                    structure.layers[layer].resources = await this.resourceScanner.scan(
                        path.join(modulePath, layer)
                    );
                }
            }

            return structure;

        } catch (error) {
            console.error(`Error scanning module ${modulePath}:`, error);
            return null;
        }
    }

    async scanLayer(layerPath) {
        try {
            if (!await fs.pathExists(layerPath)) {
                return null;
            }

            const contents = await fs.readdir(layerPath, { withFileTypes: true });
            
            const directories = contents
                .filter(item => item.isDirectory())
                .map(item => item.name);

            return {
                path: layerPath,
                directories
            };

        } catch (error) {
            console.error(`Error scanning layer ${layerPath}:`, error);
            return null;
        }
    }
}