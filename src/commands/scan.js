import { ProjectScanner } from '../core/Scanner/ProjectScanner.js';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs-extra';

export function addScanCommand(program) {
    program
        .command('scan')
        .description('Scan the current Spring Boot project structure')
        .option('-v, --verbose', 'Show detailed scanning information')
        .option('-o, --output <path>', 'Output the scan result to a file')
        .action(async (options) => {
            const spinner = ora('Scanning project structure...').start();
            
            try {
                const scanner = new ProjectScanner();
                const structure = await scanner.scan();
                
                spinner.succeed('Project structure scanned successfully!');

                if (options.verbose) {
                    console.log('\nProject Structure:');
                    console.log(chalk.blue('Base Package:'), structure.basePackage);
                    
                    console.log('\nModules:');
                    structure.modules.forEach(module => {
                        console.log(chalk.green(`\n📦 ${module.name}`));
                        
                        Object.entries(module.layers).forEach(([layerName, layer]) => {
                            if (layer) {
                                console.log(chalk.yellow(`  └─ ${layerName}`));
                                layer.directories.forEach(dir => {
                                    console.log(`     └─ ${dir}`);
                                });
                                
                                if (layer.resources && layer.resources.length > 0) {
                                    console.log(chalk.cyan('     └─ Resources:'));
                                    layer.resources.forEach(resource => {
                                        let typeInfo = resource.type;
                                        if (resource.type === 'mapper' && resource.mapperType) {
                                            typeInfo += ` (${resource.mapperType})`;
                                        }
                                        
                                        const implementationInfo = resource.implementation ? 
                                            chalk.gray(` (implemented by ${resource.implementation})`) : '';
                                            
                                        console.log(`        └─ ${resource.name} (${typeInfo})${implementationInfo}`);
                                    });
                                }
                            }
                        });
                    });
                }

                if (options.output) {
                    await fs.writeJson(`${options.output}.json`, structure, { spaces: 2 });
                    console.log(chalk.blue(`\nStructure saved to ${options.output}.json`));
                }

            } catch (error) {
                spinner.fail(chalk.red('Error scanning project structure'));
                console.error(chalk.red('\nError details:', error.message));
                process.exit(1);
            }
        });
}