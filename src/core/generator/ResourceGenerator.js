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
            case 'service':
                return await this.generateService(name, module, options);
            case 'controller':
                return await this.generateController(name, module, options);
            default:
                throw new Error(`Resource type '${type}' not implemented yet`);
        }
    }

    async generateController(resourceDetails, moduleName, options) {
        const { name, isEntityBased } = resourceDetails;

        if (isEntityBased) {
            return await this.generateEntityBasedController(name, moduleName, options);
        } else {
            return await this.generateStandaloneController(name, moduleName, options);
        }
    }

    async generateEntityBasedController(entityName, moduleName, options) {
        // Verify entity and service exist
        const servicePath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName,
            'application',
            'services',
            `${entityName}Service.java`
        );

        if (!await fs.pathExists(servicePath)) {
            throw new Error(`Service for ${entityName} not found in module ${moduleName}. Create the service first.`);
        }

        // Read entity file to determine ID type
        const entityPath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName,
            'domain',
            'entities',
            `${entityName}.java`
        );

        const entityContent = await fs.readFile(entityPath, 'utf-8');
        const isUUID = entityContent.includes('UUID');
        const idType = isUUID ? 'UUID' : 'Long';

        const moduleBasePath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName
        );

        const controllerPath = path.join(
            moduleBasePath,
            'infrastructure',
            'controllers',
            `${entityName}Controller.java`
        );

        const templateData = {
            basePackage: this.projectStructure.basePackage,
            module: moduleName,
            entityName,
            idType,
            isUUID
        };

        const content = await this.templateEngine.generateFromTemplate('controller', templateData);

        await fs.ensureDir(path.dirname(controllerPath));
        await fs.writeFile(controllerPath, content);

        return {
            createdFiles: [controllerPath]
        };
    }

    async generateStandaloneController(controllerName, moduleName, options) {
        // Remove 'Controller' suffix if present for consistency
        const baseName = controllerName.replace('Controller', '');

        const moduleBasePath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName
        );

        const controllerPath = path.join(
            moduleBasePath,
            'infrastructure',
            'controllers',
            `${baseName}Controller.java`
        );

        const templateData = {
            basePackage: this.projectStructure.basePackage,
            module: moduleName,
            controllerName: baseName
        };

        const content = await this.templateEngine.generateFromTemplate('standalone-controller', templateData);

        await fs.ensureDir(path.dirname(controllerPath));
        await fs.writeFile(controllerPath, content);

        return {
            createdFiles: [controllerPath]
        };
    }

    async generateService(resourceDetails, moduleName, options) {
        const { name, isEntityBased } = resourceDetails;

        if (isEntityBased) {
            return await this.generateEntityBasedService(name, moduleName, options);
        } else {
            return await this.generateStandaloneService(name, moduleName, options);
        }
    }

    async generateEntityBasedService(name, moduleName) {
        // Verify entity and repository exist
        const entityName = name.replace('Service', '');
        const entityPath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName,
            'domain',
            'entities',
            `${entityName}.java`
        );

        const repositoryPath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName,
            'infrastructure',
            'repositories',
            `${entityName}Repository.java`
        );

        if (!await fs.pathExists(entityPath)) {
            throw new Error(`Entity ${entityName} not found in module ${moduleName}. Create the entity first.`);
        }

        if (!await fs.pathExists(repositoryPath)) {
            throw new Error(`Repository for ${entityName} not found in module ${moduleName}. Create the repository first.`);
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

        const templateData = {
            basePackage: this.projectStructure.basePackage,
            module: moduleName,
            entityName,
            idType,
            isUUID,
            useTransactional: this.config.servicePreferences?.useTransactional ?? true
        };

        // Generate interface
        const servicePath = path.join(
            moduleBasePath,
            'application',
            'services',
            `${entityName}Service.java`
        );

        const serviceContent = await this.templateEngine.generateFromTemplate('service', templateData);

        // Generate implementation
        const serviceImplPath = path.join(
            moduleBasePath,
            'application',
            'services',
            'implementations',
            `${entityName}ServiceImpl.java`
        );

        const serviceImplContent = await this.templateEngine.generateFromTemplate('service-impl', templateData);

        await fs.ensureDir(path.dirname(servicePath));
        await fs.writeFile(servicePath, serviceContent);

        await fs.ensureDir(path.dirname(serviceImplPath));
        await fs.writeFile(serviceImplPath, serviceImplContent);

        return {
            createdFiles: [servicePath, serviceImplPath]
        };
    }

    async generateStandaloneService(serviceName, moduleName, options) {
        const moduleBasePath = path.join(
            this.projectStructure.sourcePath,
            this.projectStructure.basePackage.split('.').join(path.sep),
            moduleName
        );

        // Remove 'Service' suffix for interface name but keep it for implementation
        const baseServiceName = serviceName.replace('Service', '');

        const templateData = {
            basePackage: this.projectStructure.basePackage,
            module: moduleName,
            serviceName: baseServiceName,
            useTransactional: this.config.servicePreferences?.useTransactional ?? true
        };

        // Generate interface
        const servicePath = path.join(
            moduleBasePath,
            'application',
            'services',
            `${baseServiceName}Service.java`
        );

        // Generate implementation
        const serviceImplPath = path.join(
            moduleBasePath,
            'application',
            'services',
            'implementations',
            `${baseServiceName}ServiceImpl.java`
        );

        const serviceContent = await this.templateEngine.generateFromTemplate('standalone-service', templateData);
        const serviceImplContent = await this.templateEngine.generateFromTemplate('standalone-service-impl', templateData);

        await fs.ensureDir(path.dirname(servicePath));
        await fs.writeFile(servicePath, serviceContent);

        await fs.ensureDir(path.dirname(serviceImplPath));
        await fs.writeFile(serviceImplPath, serviceImplContent);

        return {
            createdFiles: [servicePath, serviceImplPath]
        };
    }

    async generateRepository(name, moduleName) {
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