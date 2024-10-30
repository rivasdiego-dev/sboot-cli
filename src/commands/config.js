import chalk from 'chalk';
import inquirer from 'inquirer';
import ora from 'ora';
import { ConfigManager } from '../core/Config/ConfigManager.js';

export function addConfigCommand(program) {
    program
        .command('config')
        .description('View, update or reset the CLI configuration')
        .option('-v, --view', 'View the configuration')
        .option('-r, --reset', 'Reset to default configuration')
        .option('-i, --init', 'Initialize configuration with defaults')
        .option('-p, --path <path>', 'Specify config file path')
        .action(async (options) => {
            try {
                const configPath = await getConfigPath(options.path);
                const configManager = new ConfigManager(configPath);
                const spinner = ora();

                const hasConfig = await configManager.hasConfig();

                if (options.init) {
                    if (hasConfig) {
                        console.log(chalk.yellowBright('\nWARNING: Configuration already exists! 🚨'));
                        console.log(chalk.bold('Use --reset to reset the configuration or --view to see current settings.'));
                        console.log(chalk.gray(`Configuration file: ${configManager.configFile}`));
                        return;
                    }

                    spinner.start('Initializing configuration...');
                    await configManager.resetConfig();
                    spinner.succeed('Configuration initialized successfully! 🎉');
                    console.log(chalk.blue(`\nConfiguration file created at: ${configManager.configFile}`));
                    return;
                }

                if (!hasConfig) {
                    console.log(chalk.yellowBright('\nWARNING: No configuration found! 🚨'));
                    console.log(chalk.bold('Use --init to create a new configuration.'));
                    return;
                }

                if (options.view) {
                    console.log(chalk.gray(`\nUsing configuration from: ${configManager.configFile}`));
                    await viewConfig(configManager);
                } else if (options.reset) {
                    await resetConfig(configManager, spinner);
                } else {
                    await showConfigMenu(configManager);
                }
            } catch (error) {
                console.error(chalk.red('\nError:', error.message));
                process.exit(1);
            }
        });
}

async function getConfigPath(providedPath) {
    if (providedPath) {
        return providedPath;
    }

    const { customPath } = await inquirer.prompt({
        type: 'confirm',
        name: 'customPath',
        message: 'Do you want to specify a custom path for the configuration file?',
        default: false
    });

    if (customPath) {
        const { filePath } = await inquirer.prompt({
            type: 'input',
            name: 'filePath',
            message: 'Enter the path for the configuration file:',
            default: 'screan-boot.config.json',
            validate: input => {
                if (!input.trim()) return 'Path cannot be empty';
                if (!input.endsWith('.json')) return 'File must have .json extension';
                return true;
            }
        });
        return filePath;
    }

    return 'screan-boot.config.json';
}

async function showConfigMenu(configManager) {
    const { section } = await inquirer.prompt({
        type: 'list',
        name: 'section',
        message: 'Select a configuration section to modify:',
        choices: [
            'Module Structure',
            'Mapper Configuration',
            'DTO Configuration',
            'Enum Configuration',
            'Service Configuration',
            'View Current Configuration',
            'Reset to Defaults'
        ]
    });

    switch (section) {
        case 'View Current Configuration':
            await viewConfig(configManager);
            break;
        case 'Reset to Defaults':
            await resetConfig(configManager, ora());
            break;
        default:
            await configureSection(configManager, section);
    }
}

async function configureSection(configManager, section) {
    const config = await configManager.getConfig();

    switch (section) {
        case 'Module Structure':
            await configureModuleStructure(config);
            break;
        case 'Mapper Configuration':
            await configureMapper(config);
            break;
        case 'DTO Configuration':
            await configureDTO(config);
            break;
        case 'Enum Configuration':
            await configureEnum(config);
            break;
        case 'Service Configuration':
            await configureService(config);
            break;
    }

    await configManager.saveConfig(config);
    console.log(chalk.greenBright('\nConfiguration updated successfully! 🚀'));

    const { continueConfig } = await inquirer.prompt({
        type: 'confirm',
        name: 'continueConfig',
        message: 'Would you like to configure something else?',
        default: false
    });

    if (continueConfig) {
        await showConfigMenu(configManager);
    }
}

async function configureModuleStructure(config) {
    const layers = ['application', 'domain', 'infrastructure'];
    const defaultFolders = {
        application: ['mappers', 'services'],
        domain: ['entities', 'enums'],
        infrastructure: ['controllers', 'repositories', 'dtos']
    };

    for (const layer of layers) {
        const { enabled } = await inquirer.prompt({
            type: 'confirm',
            name: 'enabled',
            message: `Enable ${layer} layer?`,
            default: config.moduleStructure?.layers[layer]?.enabled ?? true
        });

        if (!config.moduleStructure) config.moduleStructure = { layers: {} };
        if (!config.moduleStructure.layers[layer]) config.moduleStructure.layers[layer] = {};

        config.moduleStructure.layers[layer].enabled = enabled;

        if (enabled) {
            const { folders } = await inquirer.prompt({
                type: 'checkbox',
                name: 'folders',
                message: `Select folders for ${layer} layer:`,
                choices: defaultFolders[layer],
                default: config.moduleStructure.layers[layer].folders || defaultFolders[layer]
            });

            config.moduleStructure.layers[layer].folders = folders;
        }
    }
}

async function configureMapper(config) {
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'type',
            message: 'Select mapper type:',
            choices: ['mapstruct', 'manual'],
            default: config.mapperPreferences?.type || 'mapstruct'
        },
        {
            type: 'confirm',
            name: 'useSpringModel',
            message: 'Use Spring component model?',
            default: config.mapperPreferences?.useSpringModel ?? true,
            when: (answers) => answers.type === 'mapstruct'
        },
        {
            type: 'confirm',
            name: 'bidirectional',
            message: 'Generate bidirectional methods?',
            default: config.mapperPreferences?.bidirectional ?? true
        }
    ]);

    config.mapperPreferences = { ...config.mapperPreferences, ...answers };
}

async function configureDTO(config) {
    const answers = await inquirer.prompt([
        {
            type: 'list',
            name: 'defaultLocation',
            message: 'Select default location for DTOs:',
            choices: ['infrastructure', 'application'],
            default: config.dtoPreferences?.defaultLocation || 'infrastructure'
        },
        {
            type: 'checkbox',
            name: 'types',
            message: 'Select DTO types to generate:',
            choices: ['Create', 'Response', 'Update'],
            default: config.dtoPreferences?.types || ['Create']
        },
        {
            type: 'confirm',
            name: 'useLombok',
            message: 'Use Lombok for DTOs?',
            default: config.dtoPreferences?.useLombok ?? true
        }
    ]);

    config.dtoPreferences = { ...config.dtoPreferences, ...answers };
}

async function configureEnum(config) {
    const { includeDisplayName } = await inquirer.prompt({
        type: 'confirm',
        name: 'includeDisplayName',
        message: 'Include display name in enums?',
        default: config.enumPreferences?.includeDisplayName ?? true
    });

    config.enumPreferences = { includeDisplayName };
}

async function configureService(config) {
    const answers = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'useTransactional',
            message: 'Use @Transactional annotation?',
            default: config.servicePreferences?.useTransactional ?? true
        },
        {
            type: 'confirm',
            name: 'constructorInjection',
            message: 'Use constructor injection?',
            default: config.servicePreferences?.constructorInjection ?? true
        }
    ]);

    config.servicePreferences = { ...config.servicePreferences, ...answers };
}

async function viewConfig(configManager) {
    const config = await configManager.getConfig();

    console.log(chalk.magentaBright('\nCurrent Configuration:'));

    // Module Structure
    console.log(chalk.blueBright('\nModule Structure:'));
    Object.entries(config.moduleStructure?.layers || {}).forEach(([layer, conf]) => {
        console.log(chalk.whiteBright(`- ${layer}: ${formatBoolean(conf.enabled)}`));
        if (conf.enabled && conf.folders?.length > 0) {
            console.log(chalk.gray(`  Folders: ${conf.folders.join(', ')}`));
        }
    });

    // Mapper Configuration
    console.log(chalk.blueBright('\nMapper Configuration:'));
    console.log(chalk.whiteBright(`- Type: ${config.mapperPreferences?.type || 'Not set'}`));
    if (config.mapperPreferences?.type === 'mapstruct') {
        console.log(chalk.whiteBright(`- Spring Model: ${formatBoolean(config.mapperPreferences.useSpringModel)}`));
    }
    console.log(chalk.whiteBright(`- Bidirectional: ${formatBoolean(config.mapperPreferences?.bidirectional)}`));

    // DTO Configuration
    console.log(chalk.blueBright('\nDTO Configuration:'));
    console.log(chalk.whiteBright(`- Default Location: ${config.dtoPreferences?.defaultLocation || 'infrastructure'}`));
    console.log(chalk.whiteBright(`- Types: ${config.dtoPreferences?.types?.join(', ') || 'None'}`));
    console.log(chalk.whiteBright(`- Use Lombok: ${formatBoolean(config.dtoPreferences?.useLombok)}`));

    // Enum Configuration
    console.log(chalk.blueBright('\nEnum Configuration:'));
    console.log(chalk.whiteBright(`- Include Display Name: ${formatBoolean(config.enumPreferences?.includeDisplayName)}`));

    // Service Configuration
    console.log(chalk.blueBright('\nService Configuration:'));
    console.log(chalk.whiteBright(`- Use @Transactional: ${formatBoolean(config.servicePreferences?.useTransactional)}`));
    console.log(chalk.whiteBright(`- Constructor Injection: ${formatBoolean(config.servicePreferences?.constructorInjection)}`));
}

async function resetConfig(configManager, spinner) {
    const { confirm } = await inquirer.prompt({
        type: 'confirm',
        name: 'confirm',
        message: 'Are you sure you want to reset all configurations to default?',
        default: false
    });

    if (confirm) {
        spinner.start('Resetting configuration...');
        await configManager.resetConfig();
        spinner.succeed('Configuration reset successfully! ♻️');
    }
}

function formatBoolean(value) {
    return value ? chalk.greenBright('Yes ✅') : chalk.redBright('No ❌');
}