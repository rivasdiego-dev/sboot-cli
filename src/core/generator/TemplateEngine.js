import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import Handlebars from 'handlebars';

export class TemplateEngine {
    constructor() {
        const currentFilePath = fileURLToPath(import.meta.url);
        this.templatesDir = path.join(dirname(currentFilePath), '../../templates');

        // Register custom helpers
        Handlebars.registerHelper('toLowerCase', (str) => str.toLowerCase());
        Handlebars.registerHelper('toUpperCase', (str) => str.toUpperCase());
        Handlebars.registerHelper('toPascalCase', (str) => {
            return str.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                .join('');
        });
        Handlebars.registerHelper('toSnakeCase', (str) => {
            return str.trim()
                .split(/\s+/)
                .join('_')
                .toLowerCase();
        });
        Handlebars.registerHelper('lowerFirstLetter', (str) => {
            return str.charAt(0).toLowerCase() + str.slice(1);
        });
    }

    async generateFromTemplate(templateName, data) {
        const templatePath = path.join(this.templatesDir, `${templateName}.hbs`);
        const templateContent = await fs.readFile(templatePath, 'utf-8');
        const template = Handlebars.compile(templateContent);
        return template(data);
    }
}