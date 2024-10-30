import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ConfigManager } from '../core/Config/ConfigManager.js';
import { ModuleGenerator } from '../core/generator/ModuleGenerator.js';
import { ProjectScanner } from '../core/Scanner/ProjectScanner.js';

export function addCreateCommand(program) {
    program
        .command('create')
        .description('Create a new module or resource')
        .argument('<type>', 'Type of creation (module or resource)')
        .argument('[name]', 'Name of the module/resource')
        .option('-v, --verbose', 'Show detailed creation information')
        .action(async (type, name, options) => {
            if (type.toLowerCase() === 'module') {
                await handleModuleCreation(name, options);
            } else if (type.toLowerCase() === 'resource') {
                console.log(chalk.yellow('Resource creation not implemented yet'));
            } else {
                console.log(chalk.red('Invalid creation type. Use "module" or "resource"'));
            }
        });
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

async function getModuleName(providedName, projectStructure) {
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