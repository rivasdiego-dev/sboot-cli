import chalk from 'chalk';

export class Logger {
    info(message, ...args) {
        console.log(chalk.blue('ℹ'), chalk.blue(message), ...args);
    }

    success(message, ...args) {
        console.log(chalk.green('✓'), chalk.green(message), ...args);
    }

    error(message, ...args) {
        console.error(chalk.red('✖'), chalk.red(message), ...args);
    }

    warn(message, ...args) {
        console.warn(chalk.yellow('⚠'), chalk.yellow(message), ...args);
    }

    debug(message, ...args) {
        if (process.env.DEBUG) {
            console.log(chalk.gray('🔍'), chalk.gray(message), ...args);
        }
    }
}