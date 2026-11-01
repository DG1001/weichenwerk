# My XaresAICoder Project

Welcome to your new development workspace! This is a clean slate for you to build whatever you want.

## 🚀 Getting Started

This workspace comes with:
- ✅ **Git repository** initialized and ready for commits
- ✅ **VS Code** configured for development
- ✅ **AI coding tools** available in the terminal
- ✅ **Port forwarding** set up for web applications

## 🛠️ What's Next?

1. **Choose your stack**: Install the tools and frameworks you need
2. **Start coding**: Create your project files and structure
3. **Use AI assistance**: Try the available AI tools to boost your productivity
4. **Deploy**: Use port forwarding to test your web applications

## 🤖 Available AI Tools

All AI tools are pre-installed and ready to use:

### Command Line Tools
- `claude` - Claude Code, Anthropic's agentic coding tool
- `codex` - OpenAI Codex CLI
- `copilot` - GitHub Copilot CLI
- `opencode` - OpenCode, multi-provider coding agent
- `crush` - Multi-model AI agent with in-session model switching
- `pi` - Minimal multi-provider coding agent

Update them with `update_ai_agents` (all) or `update_ai_agents <tool>`.

### VS Code Extensions (pre-installed)
- **Cline** - agent for multi-file edits (`saoudrizwan.claude-dev`)
- **Claude Code** - VS Code panel for the `claude` CLI (`anthropic.claude-code`)

Optional, not pre-installed (about 550 MB, uses about 350 MB RAM even when idle):
**Kilo Code**, agent with chat and autocomplete - `code-server --install-extension kilocode.kilo-code`

## 🌐 Port Forwarding

When you start a web server, VS Code will automatically detect it and offer to open it in your browser. Common ports are pre-configured:

- **Port 3000**: Node.js/React applications
- **Port 5000**: Flask/Python applications  
- **Port 8000**: Django applications
- **Port 8080**: Java Spring Boot applications
- **Port 4200**: Angular applications

## 📝 Tips

- Use `git status` to check your repository status
- Run `info` to see all pre-installed AI tools and their setup hints
- Install language extensions in VS Code for better development experience
- Use the integrated terminal for all your development commands

## 🔧 Common Setup Commands

### Node.js/JavaScript
```bash
npm init -y
npm install express
```

### Python
```bash
python3 -m venv venv
source venv/bin/activate
pip install flask fastapi django
```

### Java
```bash
# Maven project
mvn archetype:generate -DgroupId=com.example -DartifactId=my-app

# Gradle project  
gradle init --type java-application
```

### Go
```bash
go mod init my-project
```

Happy coding! 🎉
