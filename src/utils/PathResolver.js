import fs from 'fs-extra';
import path from 'path';

export class PathResolver {
    findJavaSourcePath() {
        const projectRoot = this.getProjectRootPath();
        const commonSourcePaths = [
            'src/main/java',
            'app/src/main/java'
        ];

        for (const sourcePath of commonSourcePaths) {
            const fullPath = path.join(projectRoot, sourcePath);
            if (fs.existsSync(fullPath)) {
                return fullPath;
            }
        }

        throw new Error('Could not find Java source directory. Make sure you are in a Spring Boot project root directory.');
    }

    isGradleProject() {
        const projectRoot = this.getProjectRootPath();
        return fs.existsSync(path.join(projectRoot, 'build.gradle')) || 
               fs.existsSync(path.join(projectRoot, 'build.gradle.kts'));
    }

    isMavenProject() {
        const projectRoot = this.getProjectRootPath();
        return fs.existsSync(path.join(projectRoot, 'pom.xml'));
    }

    getProjectRootPath() {
        // Start with current directory
        let currentPath = process.cwd();
        
        // Look for common project files
        while (currentPath !== path.parse(currentPath).root) {
            if (
                fs.existsSync(path.join(currentPath, 'pom.xml')) ||
                fs.existsSync(path.join(currentPath, 'build.gradle')) ||
                fs.existsSync(path.join(currentPath, 'build.gradle.kts'))
            ) {
                return currentPath;
            }
            currentPath = path.dirname(currentPath);
        }
        
        // If no project root markers found, return current directory
        return process.cwd();
    }

    resolveProjectPath(...paths) {
        return path.join(this.getProjectRootPath(), ...paths);
    }
}