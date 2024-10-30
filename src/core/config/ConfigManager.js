import fs from 'fs-extra';
import path from 'path';

export class ConfigManager {
    constructor(configPath) {
        this.configFile = configPath || 'screan-boot.config.json';
    }

    async ensureConfigFile() {
        const exists = await fs.pathExists(this.configFile);
        if (!exists) {
            const defaultConfig = await this.getDefaultConfig();
            await this.saveConfig(defaultConfig);
        }
    }

    async getDefaultConfig() {
        return {
            moduleStructure: {
                layers: {
                    application: {
                        enabled: true,
                        folders: ['mappers', 'services']
                    },
                    domain: {
                        enabled: true,
                        folders: ['entities', 'enums']
                    },
                    infrastructure: {
                        enabled: true,
                        folders: ['controllers', 'repositories', 'dtos']
                    }
                }
            },
            mapperPreferences: {
                type: 'mapstruct',
                useSpringModel: true,
                bidirectional: true
            },
            dtoPreferences: {
                defaultLocation: 'infrastructure',
                types: ['Create'],
                useLombok: true
            },
            enumPreferences: {
                includeDisplayName: true
            },
            servicePreferences: {
                useTransactional: true,
                constructorInjection: true
            }
        };
    }

    async getConfig() {
        try {
            if (await this.hasConfig()) {
                return await fs.readJson(this.configFile);
            }

            // If no config exists, create with defaults
            const defaultConfig = await this.getDefaultConfig();
            await this.saveConfig(defaultConfig);
            return defaultConfig;
        } catch (error) {
            throw new Error(`Error reading configuration: ${error.message}`);
        }
    }

    async saveConfig(config) {
        try {
            await fs.writeJson(this.configFile, config, { spaces: 2 });
            return path.resolve(this.configFile);
        } catch (error) {
            throw new Error(`Error saving configuration: ${error.message}`);
        }
    }

    async resetConfig() {
        try {
            const defaultConfig = await this.getDefaultConfig();
            const savePath = await this.saveConfig(defaultConfig);
            return { config: defaultConfig, path: savePath };
        } catch (error) {
            throw new Error(`Error resetting configuration: ${error.message}`);
        }
    }

    async hasConfig() {
        return fs.pathExists(this.configFile);
    }
}