<div align="center">

# 🚀 Sboot CLI

A powerful CLI tool for Spring Boot that supercharges your development workflow by generating clean, standardized code following Screaming and Clean Architecture patterns.

[![npm version](https://badge.fury.io/js/sboot-cli.svg)](https://badge.fury.io/js/sboot-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

</div>

## 📋 Features

- 🏗️ **Modular Structure**: Automatically creates clean, organized module structures
- 🎯 **Smart Generation**: Creates entities, repositories, services, and controllers
- 🧱 **Clean Architecture**: Follows Screaming Architecture principles out of the box
- ⚡ **Full Generation**: Generate complete resource stack with a single command
- 🎨 **Customizable**: Flexible configuration to match your project needs
- 💻 **Interactive**: User-friendly CLI interface with intuitive prompts

## 🛠️ Installation

```bash
npm install -g sboot-cli
```

## 📚 Usage

### Module Creation

Create a new module in your Spring Boot project:

```bash
sboot create module users
```

### Resource Creation

Generate individual resources with interactive prompts:

```bash
sboot create resource
```

Or specify all details directly:

```bash
# Create an entity
sboot create resource User --module users --type entity

# Create a repository
sboot create resource User --module users --type repository

# Create a service
sboot create resource User --module users --type service

# Create a controller
sboot create resource User --module users --type controller
```

### ⚡ Quick Generation

Generate a complete resource stack (entity, repository, service, and controller) in one go:

```bash
sboot create resource User --module users --full
```

### ⚙️ Configuration

```bash
# View current configuration
sboot config -v

# Initialize configuration
sboot config --init

# Reset to defaults
sboot config --reset
```

## 📁 Generated Structure

```text
module/
├── application/
│   ├── mappers/
│   └── services/
│       ├── UserService.java
│       └── implementations/
│           └── UserServiceImpl.java
├── domain/
│   ├── entities/
│   │   └── User.java
│   └── enums/
└── infrastructure/
    ├── controllers/
    │   └── UserController.java
    ├── repositories/
    │   └── UserRepository.java
    └── dtos/
```

## 🎯 Command Options

### Global Options

- `-v, --verbose`: Show detailed output
- `-h, --help`: Display help for command

### Create Command

```bash
sboot create [options] <type> [name]
```

Options:

- `-m, --module <module>`: Specify module name
- `-t, --type <type>`: Resource type (entity, repository, service, controller)
- `-f, --full`: Generate complete resource stack

### Config Command

```bash
sboot config [options]
```

Options:

- `-v, --view`: View current configuration
- `-r, --reset`: Reset to default configuration
- `-i, --init`: Initialize configuration

## 🔮 Upcoming Features

### 🎯 Coming Soon

- **MapStruct Mappers**: Smart generation of MapStruct mappers with:
  - Automatic entity-to-DTO mappings
  - Bidirectional mapping support
  - Spring component model integration
  - Custom mapping methods

- **Enhanced DTO Generation**:
  - Flexible DTO creation (Create, Response, or custom)
  - Configurable location (application or infrastructure layer)
  - Lombok integration
  - Smart field mapping from entities

- **Smart Enum Support**:
  - Display name pattern support
  - Lombok integration
  - Custom enum patterns
  - Value handling support

### 🌟 Future Enhancements

- Project scaffolding and initialization
- Custom template support
- Integration with Spring Security
- OpenAPI documentation generation
- Unit test generation
- Custom annotation support

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check our [issues page](YOUR_GITHUB_REPO_URL/issues).

## 📝 License

This project is [MIT](./LICENSE) licensed.

---

<div align="center">
Made with ❤️ for Spring Boot developers
</div>
