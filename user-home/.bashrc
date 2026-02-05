# Admin Backend Shell Configuration
export PS1='\[\033[01;32m\]admin@backend\[\033[00m\]:\[\033[01;34m\]\w\[\033[00m\]\$ '
export PATH="$HOME/bin:$HOME/.local/bin:$PATH"
export INTERNAL_API_TOKEN="046ec8045305a23c979e11e70d5eaa1ccd961fdc3e344ddab17d6b86679319fa"

# Aliases
alias ll='ls -la'
alias la='ls -A'
alias l='ls -CF'

# Welcome message
echo "Welcome to your backend environment!"
echo "Your files are persisted in ~/projects"
echo "Internal API token available as \$INTERNAL_API_TOKEN"
echo ""
