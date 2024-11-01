import fs from 'fs-extra';
import path from 'path';
import { TemplateEngine } from './TemplateEngine.js';
import { Logger } from '../../utils/Logger.js';

export class ResourceGenerator {
    constructor(projectStructure, config, verbose = false) {
        this.projectStructure = projectStructure;
        this.config = config;
        this.templateEngine = new TemplateEngine();
        this.logger = new Logger();
        this.verbose = verbose;
    }

    async generate(resourceDetails) {
        const { name, type, module, options = {} } = resourceDetails;
        
        if (this.verbose) {
            this.logger.info(`Generating ${type} resource: ${name} in module ${module}`);
        }
    
        switch (type) {
            case 'entity':
                return await this.generateEntity(name, module, options);
            case 'repository':
                return await this.generateRepository(name, module, options);
            default:
                throw new Error(`Resource type '${type}' not implemented yet`);
        }
    }

    async generateRepository(name, moduleName, options) {
        // Verify entity exists
        const entityName = name.replace('Repository', '');
        const entityPath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName,
            'domain',
            'entities',
            `${entityName}.java`
        );
    
        if (!await fs.pathExists(entityPath)) {
            throw new Error(`Entity ${entityName} not found in module ${moduleName}. Create the entity first.`);
        }
    
        // Read entity file to determine ID type
        const entityContent = await fs.readFile(entityPath, 'utf-8');
        const isUUID = entityContent.includes('UUID');
        const idType = isUUID ? 'UUID' : 'Long';
    
        const moduleBasePath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName
        );
    
        const repositoryPath = path.join(
            moduleBasePath, 
            'infrastructure', 
            'repositories', 
            `${entityName}Repository.java`
        );
    
        if (this.verbose) {
            this.logger.info(`Creating repository for entity: ${entityName}`);
            this.logger.info(`Using ID type: ${idType}`);
        }
    
        const templateData = {
            basePackage: this.projectStructure.basePackage,
            module: moduleName,
            entityName,
            idType,
            isUUID
        };
    
        const content = await this.templateEngine.generateFromTemplate('repository', templateData);
    
        await fs.ensureDir(path.dirname(repositoryPath));
        await fs.writeFile(repositoryPath, content);
    
        return {
            createdFiles: [repositoryPath]
        };
    }

    async generateEntity(name, moduleName, options) {
        const idType = options.idType?.toUpperCase() ||
            this.config.entityPreferences?.defaultIdType ||
            'UUID';

        const moduleBasePath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName
        );

        const pascalName = name
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join('');

        const entityPath = path.join(moduleBasePath, 'domain', 'entities', `${pascalName}.java`);

        const templateData = {
            basePackage: this.projectStructure.basePackage,
            module: moduleName,
            name: name,
            idType: idType === 'UUID' ? 'UUID' : 'Long',
            idGenerationType: idType === 'UUID' ? 'UUID' : 'IDENTITY',
            isUUID: idType === 'UUID'
        };

        if (this.verbose) {
            this.logger.info(`Using ID type: ${idType}`);
        }

        const content = await this.templateEngine.generateFromTemplate('entity', templateData);

        await fs.ensureDir(path.dirname(entityPath));
        await fs.writeFile(entityPath, content);

        return {
            createdFiles: [entityPath]
        };
    }
}