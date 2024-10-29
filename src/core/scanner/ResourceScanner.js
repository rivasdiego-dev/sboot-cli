import fs from 'fs-extra';
import path from 'path';

export class ResourceScanner {
    async scan(directoryPath) {
        try {
            const resources = [];
            const files = await this.getAllFiles(directoryPath);
            
            const allResources = await Promise.all(files
                .filter(file => file.endsWith('.java'))
                .map(file => this.analyzeJavaFile(file)));

            const validResources = allResources.filter(r => r !== null);
            const resourceMap = new Map();
            
            validResources.forEach(resource => {
                const key = resource.interfaceName || resource.name;
                if (!resourceMap.has(key)) {
                    resourceMap.set(key, {
                        name: key,
                        type: resource.type,
                        path: resource.path,
                        implementation: resource.isImplementation ? resource.name : null,
                        mapperType: resource.mapperType
                    });
                } else {
                    const existing = resourceMap.get(key);
                    if (resource.isImplementation) {
                        existing.implementation = resource.name;
                    }
                }
            });

            return Array.from(resourceMap.values());
        } catch (error) {
            console.error(`Error scanning resources in ${directoryPath}:`, error);
            return [];
        }
    }

    async getAllFiles(dirPath) {
        const files = [];
        const items = await fs.readdir(dirPath, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dirPath, item.name);
            if (item.isDirectory()) {
                files.push(...await this.getAllFiles(fullPath));
            } else {
                files.push(fullPath);
            }
        }
        return files;
    }

    async analyzeJavaFile(filePath) {
        try {
            const content = await fs.readFile(filePath, 'utf-8');
            const fileName = path.basename(filePath, '.java');
            const relativePath = path.relative(process.cwd(), filePath);
            
            const isImplementation = fileName.endsWith('Impl');
            const interfaceName = isImplementation ? fileName.replace('Impl', '') : null;
            
            let type = this.determineResourceType(content, fileName);
            let mapperType = this.determineMapperType(content);

            return {
                name: fileName,
                type,
                path: relativePath,
                isImplementation,
                interfaceName,
                isInterface: content.includes('interface '),
                mapperType
            };

        } catch (error) {
            console.error(`Error analyzing file ${filePath}:`, error);
            return null;
        }
    }

    determineResourceType(content, fileName) {
        if (content.includes('public enum')) {
            return 'enum';
        }
        if (content.includes('@Entity') || content.includes('@Table')) {
            return 'entity';
        }
        if (content.includes('@Service')) {
            return 'service';
        }
        if (content.includes('@Controller') || content.includes('@RestController')) {
            return 'controller';
        }
        if (content.includes('@Repository')) {
            return 'repository';
        }
        if (fileName.endsWith('DTO') || fileName.endsWith('Dto')) {
            return 'dto';
        }
        if (this.determineMapperType(content) !== null) {
            return 'mapper';
        }
        // Check for interface types
        if (content.includes('interface')) {
            if (content.includes('Repository')) return 'repository';
            if (content.includes('Service')) return 'service';
            if (fileName.includes('Mapper')) return 'mapper';
        }
        return 'unknown';
    }

    determineMapperType(content) {
        if (!content.includes('@Mapper')) {
            return null;
        }

        if (content.includes('@Mapper(componentModel = "spring")')) {
            return 'mapstruct-spring';
        }

        return 'mapstruct';
    }

    determineInterfaceType(content, fileName) {
        if (content.includes('extends JpaRepository')) {
            return 'repository';
        }
        if (fileName.includes('Service')) {
            return 'service';
        }
        if (fileName.includes('Mapper')) {
            return 'mapper';
        }
        return 'unknown';
    }
}