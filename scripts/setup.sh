#!/bin/bash

# K8s-Clone Setup Script
# This script sets up the configuration file and environment variable for k8s-clone

set -e

# Configuration
CONFIG_DIR="$HOME/.k8s-clone"
CONFIG_FILE="$CONFIG_DIR/config"
ENV_VAR_NAME="K8S_CLONE_CONFIG"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Print colored messages
info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect the user's shell and config file
detect_shell_config() {
    local shell_name
    shell_name=$(basename "$SHELL")
    
    case "$shell_name" in
        zsh)
            echo "$HOME/.zshrc"
            ;;
        bash)
            # Check for .bash_profile first (macOS), then .bashrc (Linux)
            if [[ -f "$HOME/.bash_profile" ]]; then
                echo "$HOME/.bash_profile"
            elif [[ -f "$HOME/.bashrc" ]]; then
                echo "$HOME/.bashrc"
            else
                echo "$HOME/.bash_profile"
            fi
            ;;
        fish)
            # Ensure fish config directory exists
            mkdir -p "$HOME/.config/fish"
            echo "$HOME/.config/fish/config.fish"
            ;;
        *)
            # Default to .profile for other shells
            echo "$HOME/.profile"
            ;;
    esac
}

# Create the config directory and file
create_config() {
    info "Creating k8s-clone configuration directory..."
    
    # Create config directory if it doesn't exist
    if [[ ! -d "$CONFIG_DIR" ]]; then
        mkdir -p "$CONFIG_DIR"
        info "Created directory: $CONFIG_DIR"
    else
        info "Directory already exists: $CONFIG_DIR"
    fi
    
    # Create config file with default empty structure if it doesn't exist
    if [[ ! -f "$CONFIG_FILE" ]]; then
        cat > "$CONFIG_FILE" << 'EOF'
{
    "clusters": [],
    "namespaces": {},
    "services": {},
    "deployments": {},
    "configMaps": {},
    "secrets": {},
    "persistentVolumeClaims": {}
}
EOF
        info "Created config file: $CONFIG_FILE"
    else
        info "Config file already exists: $CONFIG_FILE"
    fi
}

# Add environment variable to shell config
add_env_var() {
    local shell_config
    shell_config=$(detect_shell_config)
    
    info "Detected shell config: $shell_config"
    
    # Check if the environment variable is already set in the shell config
    # Use precise check to match only actual export/set statements
    local shell_name
    shell_name=$(basename "$SHELL")
    if [[ "$shell_name" == "fish" ]]; then
        if grep -q "^[[:space:]]*set -x $ENV_VAR_NAME " "$shell_config" 2>/dev/null; then
            warn "Environment variable $ENV_VAR_NAME already exists in $shell_config"
            return 0
        fi
    else
        if grep -q "^[[:space:]]*export $ENV_VAR_NAME=" "$shell_config" 2>/dev/null; then
            warn "Environment variable $ENV_VAR_NAME already exists in $shell_config"
            return 0
        fi
    fi
    
    # Create the shell config file if it doesn't exist
    if [[ ! -f "$shell_config" ]]; then
        touch "$shell_config"
    fi
    
    # Add a newline if the file doesn't end with one
    if [[ -s "$shell_config" ]] && [[ $(tail -c1 "$shell_config" | wc -l) -eq 0 ]]; then
        echo "" >> "$shell_config"
    fi
    
    # Add the environment variable with a descriptive comment
    # Use appropriate syntax based on shell type
    if [[ "$shell_name" == "fish" ]]; then
        cat >> "$shell_config" << EOF

# K8s-clone configuration file path - Used by k8s-clone tool to store cluster defaults
set -x $ENV_VAR_NAME "\$HOME/.k8s-clone/config"
EOF
    else
        cat >> "$shell_config" << EOF

# K8s-clone configuration file path - Used by k8s-clone tool to store cluster defaults
export $ENV_VAR_NAME="\$HOME/.k8s-clone/config"
EOF
    fi
    
    info "Added $ENV_VAR_NAME to $shell_config"
    info "Please run 'source $shell_config' or restart your terminal to apply changes"
}

# Main setup function
main() {
    echo ""
    info "Setting up k8s-clone configuration..."
    echo ""
    
    create_config
    add_env_var
    
    echo ""
    info "Setup complete!"
    echo ""
    echo "Configuration file location: $CONFIG_FILE"
    echo "Environment variable: $ENV_VAR_NAME"
    echo ""
    echo "To customize your k8s-clone defaults, edit the config file:"
    echo "  \$ nano $CONFIG_FILE"
    echo ""
    echo "Example config with clusters and namespaces:"
    echo '  {'
    echo '    "clusters": [{ "name": "production" }, { "name": "staging" }],'
    echo '    "namespaces": {'
    echo '      "production": [{ "name": "app-ns" }],'
    echo '      "staging": [{ "name": "test-ns" }]'
    echo '    }'
    echo '  }'
    echo ""
}

# Run main function
main "$@"
