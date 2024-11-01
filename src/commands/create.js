import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ConfigManager } from '../core/Config/ConfigManager.js';
import { ModuleGenerator } from '../core/generator/ModuleGenerator.js';
import { ProjectScanner } from '../core/Scanner/ProjectScanner.js';
import { ResourceGenerator } from '../core/generator/ResourceGenerator.js';

export function addCreateCommand(program) {
    program
        .command('create')
        .description('Create a new module or resource')
        .argument('<type>', 'Type of creation (module or resource)')
        .argument('[name]', 'Name of the module/resource')
        .option('-m, --module <module>', 'Module name (for resources)')
        .option('-t, --type <type>', 'Resource type (entity, service, dto, etc.)')
        .option('-f, --full', 'Generate complete sequence (entity, repository, service, controller)')
        .option('-v, --verbose', 'Show detailed creation information')
        .action(async (type, name, options) => {
            if (type.toLowerCase() === 'module') {
                await handleModuleCreation(name, options);
            } else if (type.toLowerCase() === 'resource') {
                if (options.full) {
                    await handleFullResourceCreation(name, options);
                } else {
                    await handleResourceCreation(name, options);
                }
            } else {
                console.log(chalk.red('Invalid creation type. Use "module" or "resource"'));
            }
        });
}

async function handleFullResourceCreation(providedName, options) {
    const spinner = ora();
    try {
        // Get project structure
        spinner.start('Analyzing project structure...');
        const scanner = new ProjectScanner(options.verbose);
        const projectStructure = await scanner.scan();
        spinner.succeed('Project structure analyzed');

        // Get configuration
        const configManager = new ConfigManager();
        const config = await configManager.getConfig();

        // Get module first if not provided
        const module = await getModule(options.module, projectStructure);

        // Get entity name if not provided
        let entityName = providedName;
        if (!entityName) {
            const { inputName } = await inquirer.prompt({
                type: 'input',
                name: 'inputName',
                message: 'Enter the entity name:',
                validate: (input) => {
                    if (!input.trim()) {
                        return 'Name cannot be empty';
                    }
                    if (!/^[A-Z][a-zA-Z0-9 ]*$/.test(input)) {
                        return 'Name must start with uppercase letter and contain only letters, numbers and spaces';
                    }
                    return true;
                }
            });
            entityName = inputName;
        }

        const resourceGenerator = new ResourceGenerator(projectStructure, config, options.verbose);

        // Generate Entity
        spinner.start('Creating entity...');
        await resourceGenerator.generate({
            type: 'entity',
            name: entityName,
            module,
            options: {}
        });
        spinner.succeed(chalk.green(`${entityName} entity created successfully!`));

        // Generate Repository
        spinner.start('Creating repository...');
        await resourceGenerator.generate({
            type: 'repository',
            name: entityName,
            module,
            options: {}
        });
        spinner.succeed(chalk.green(`${entityName}Repository created successfully!`));

        // Generate Service
        spinner.start('Creating service...');
        await resourceGenerator.generate({
            type: 'service',
            name: { name: entityName, isEntityBased: true },
            module,
            options: {}
        });
        spinner.succeed(chalk.green(`${entityName}Service created successfully!`));

        // Generate Controller
        spinner.start('Creating controller...');
        await resourceGenerator.generate({
            type: 'controller',
            name: { name: entityName, isEntityBased: true },
            module,
            options: {}
        });
        spinner.succeed(chalk.green(`${entityName}Controller created successfully!`));

        console.log(chalk.green('\n✨ Full resource generation completed successfully!'));

        if (options.verbose) {
            console.log(chalk.blue('\nGenerated resources:'));
            console.log(chalk.gray(`- ${entityName}.java`));
            console.log(chalk.gray(`- ${entityName}Repository.java`));
            console.log(chalk.gray(`- ${entityName}Service.java`));
            console.log(chalk.gray(`- ${entityName}ServiceImpl.java`));
            console.log(chalk.gray(`- ${entityName}Controller.java`));
        }

    } catch (error) {
        spinner.fail(chalk.red('Error in full resource generation'));
        console.error(chalk.red('\nError details:', error.message));
        if (options.verbose) {
            console.error(chalk.gray('\nStack trace:', error.stack));
        }
        process.exit(1);
    }
}

async function handleResourceCreation(providedName, options) {
    const spinner = ora();
    try {
        // Get project structure
        spinner.start('Analyzing project structure...');
        const scanner = new ProjectScanner(options.verbose);
        const projectStructure = await scanner.scan();
        spinner.succeed('Project structure analyzed');

        // Get configuration
        const configManager = new ConfigManager();
        const config = await configManager.getConfig();

        // Get resource details
        const resourceDetails = await getResourceDetails(providedName, projectStructure, options);

        // Generate resource
        spinner.start(`Creating ${resourceDetails.type} resource...`);
        const resourceGenerator = new ResourceGenerator(projectStructure, config, options.verbose);
        const result = await resourceGenerator.generate(resourceDetails);

        // Custom success messages based on type
        if (resourceDetails.type === 'repository') {
            spinner.succeed(chalk.green(`${resourceDetails.name}Repository created successfully!`));
        } else if (resourceDetails.type === 'service') {
            const serviceName = typeof resourceDetails.name === 'object' ? resourceDetails.name.name : resourceDetails.name;
            const suffix = serviceName.endsWith('Service') ? '' : 'Service';
            spinner.succeed(chalk.green(`${serviceName}${suffix} created successfully!`));
        } else if (resourceDetails.type === 'controller') {
            const controllerName = typeof resourceDetails.name === 'object' ? resourceDetails.name.name : resourceDetails.name;
            const suffix = controllerName.endsWith('Controller') ? '' : 'Controller';
            spinner.succeed(chalk.green(`${controllerName}${suffix} created successfully!`));
        } else {
            spinner.succeed(chalk.green(`Resource '${resourceDetails.name}' created successfully!`));
        }

        if (options.verbose) {
            console.log('\nFiles created:');
            result.createdFiles.forEach(file => {
                console.log(chalk.gray(`- ${file}`));
            });
        }

    } catch (error) {
        spinner.fail(chalk.red('Error creating resource'));
        console.error(chalk.red('\nError details:', error.message));
        if (options.verbose) {
            console.error(chalk.gray('\nStack trace:', error.stack));
        }
        process.exit(1);
    }
}

async function getResourceDetails(providedName, projectStructure, options) {
    // Get module
    const module = await getModule(options.module, projectStructure);

    // Get resource type
    const type = await getResourceType(options.type);

    // Get resource name
    const name = await getResourceName(providedName, type, projectStructure, module);

    return {
        name,
        type,
        module,
        options: {
            idType: options.idtype
        }
    };
}

async function getModule(providedModule, projectStructure) {
    if (providedModule) {
        const moduleExists = projectStructure.modules.some(m => m.name === providedModule);
        if (!moduleExists) {
            throw new Error(`Module '${providedModule}' not found`);
        }
        return providedModule;
    }

    const modules = projectStructure.modules.map(m => m.name);
    if (modules.length === 0) {
        throw new Error('No modules found in project. Create a module first.');
    }

    const { module } = await inquirer.prompt({
        type: 'list',
        name: 'module',
        message: 'Select a module:',
        choices: modules
    });

    return module;
}

async function getResourceType(providedType) {
    const types = ['entity', 'service', 'dto', 'repository', 'controller', 'mapper', 'enum'];

    if (providedType) {
        if (!types.includes(providedType.toLowerCase())) {
            throw new Error(`Invalid resource type. Valid types are: ${types.join(', ')}`);
        }
        return providedType.toLowerCase();
    }

    const { type } = await inquirer.prompt({
        type: 'list',
        name: 'type',
        message: 'Select resource type:',
        choices: types
    });

    return type;
}

async function getResourceName(providedName, type, projectStructure, module) {
    if (type === 'repository') {
        return await selectEntityForRepository(providedName, projectStructure, module);
    }

    if (type === 'service' || type === 'controller') {
        return await getServiceOrControllerName(providedName, type, projectStructure, module);
    }

    // Original name logic for other types
    let name = providedName;
    if (!name) {
        const { inputName } = await inquirer.prompt({
            type: 'input',
            name: 'inputName',
            message: `Enter the ${type} name:`,
            validate: (input) => {
                if (!input.trim()) {
                    return 'Name cannot be empty';
                }
                if (!/^[A-Z][a-zA-Z0-9 ]*$/.test(input)) {
                    return 'Name must start with uppercase letter and contain only letters, numbers and spaces';
                }
                return true;
            }
        });
        name = inputName;
    }
    return name;
}

async function getServiceOrControllerName(providedName, type, projectStructure, module) {
    // If name provided via command line, assume it's standalone
    if (providedName) {
        return {
            name: providedName,
            isEntityBased: false
        };
    }

    // Ask if resource is entity-based
    const { isEntityBased } = await inquirer.prompt({
        type: 'confirm',
        name: 'isEntityBased',
        message: `Is this ${type} based on an entity?`,
        default: true
    });

    if (isEntityBased) {
        const entities = await getAvailableEntities(projectStructure, module);

        if (entities.length === 0) {
            throw new Error(`No entities found in module '${module}'. Create an entity first or create a non-entity-based ${type}.`);
        }

        const { selectedEntity } = await inquirer.prompt({
            type: 'list',
            name: 'selectedEntity',
            message: `Select the entity for the ${type}:`,
            choices: entities
        });

        return {
            name: selectedEntity,
            isEntityBased: true
        };
    } else {
        const { resourceName } = await inquirer.prompt({
            type: 'input',
            name: 'resourceName',
            message: `Enter the ${type} name:`,
            validate: (input) => {
                if (!input.trim()) {
                    return `${type} name cannot be empty`;
                }
                if (!/^[A-Z][a-zA-Z0-9]*$/.test(input)) {
                    return `${type} name must start with uppercase letter and contain only letters and numbers`;
                }
                if (type === 'service' && !input.endsWith('Service')) {
                    return 'Service name must end with "Service"';
                }
                if (type === 'controller' && !input.endsWith('Controller')) {
                    return 'Controller name must end with "Controller"';
                }
                return true;
            }
        });

        return {
            name: resourceName,
            isEntityBased: false
        };
    }
}

async function selectEntityForRepository(providedName, projectStructure, moduleName) {
    // If name is provided via command line, validate it exists
    if (providedName) {
        const entityExists = await validateEntityExists(providedName, projectStructure, moduleName);
        if (!entityExists) {
            throw new Error(`Entity '${providedName}' not found in module '${moduleName}'`);
        }
        return providedName;
    }

    // Get available entities in the module
    const entities = await getAvailableEntities(projectStructure, moduleName);

    if (entities.length === 0) {
        throw new Error(`No entities found in module '${moduleName}'. Create an entity first.`);
    }

    const { selectedEntity } = await inquirer.prompt({
        type: 'list',
        name: 'selectedEntity',
        message: 'Select the entity for the repository:',
        choices: entities
    });

    return selectedEntity;
}

async function getAvailableEntities(projectStructure, moduleName) {
    const selectedModule = projectStructure.modules.find(m => m.name === moduleName);
    if (!selectedModule) return [];

    // Filter for entities in the domain layer
    const domainLayer = selectedModule.layers.domain;
    if (!domainLayer || !domainLayer.resources) return [];

    return domainLayer.resources
        .filter(resource => resource.type === 'entity')
        .map(entity => entity.name);
}

async function validateEntityExists(entityName, projectStructure, moduleName) {
    const entities = await getAvailableEntities(projectStructure, moduleName);
    return entities.includes(entityName);
}

async function handleModuleCreation(providedName, options) {
    const spinner = ora();
    try {
        // Get project structure first
        const scanner = new ProjectScanner(options.verbose);
        const projectStructure = await scanner.scan();


        if (options.verbose) {
            console.log(chalk.blue('\nBase package found:'), projectStructure.basePackage);
            console.log(chalk.blue('Source path:'), projectStructure.sourcePath);
        }

        // Get module name if not provided
        const moduleName = await getModuleName(providedName, projectStructure);

        // Load configuration
        const configManager = new ConfigManager();
        const config = await configManager.getConfig();

        // Create module
        spinner.start('Creating module structure...');
        const moduleGenerator = new ModuleGenerator(projectStructure, config);
        const result = await moduleGenerator.generate(moduleName, options.verbose);

        spinner.succeed(chalk.green(`Module '${moduleName}' created successfully!`));

        if (options.verbose) {
            console.log('\nModule structure created:');
            result.createdPaths.forEach(path => {
                console.log(chalk.gray(`- ${path}`));
            });
        }

    } catch (error) {
        spinner.fail(chalk.red('Error creating module'));
        console.error(chalk.red('\nError details:', error.message));
        if (options.verbose) {
            console.error(chalk.gray('\nStack trace:', error.stack));
        }
        process.exit(1);
    }
}

async function getModuleName(providedName) {
    if (providedName) {
        // Validate provided name
        if (!/^[a-z][a-z0-9]*$/.test(providedName)) {
            throw new Error('Module name must start with lowercase letter and contain only letters and numbers');
        }
        return providedName;
    }

    const { moduleName } = await inquirer.prompt({
        type: 'input',
        name: 'moduleName',
        message: 'Enter the module name:',
        validate: (input) => {
            if (!input.trim()) {
                return 'Module name cannot be empty';
            }
            if (!/^[a-z][a-z0-9]*$/.test(input)) {
                return 'Module name must start with lowercase letter and contain only letters and numbers';
            }
            return true;
        }
    });

    return moduleName;
}