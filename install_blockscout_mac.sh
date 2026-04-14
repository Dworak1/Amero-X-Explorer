#!/bin/bash
set -e

echo "Starting Blockscout Native Dependency Installation for macOS..."

# 1. Update and install base requirements via Homebrew
echo "Installing base packages using Homebrew..."
if ! command -v brew &> /dev/null; then
    echo "Homebrew not found! Please install Homebrew first: https://brew.sh/"
    exit 1
fi

brew update
brew install postgresql automake autoconf openssl wxwidgets libxslt fop coreutils gawk || true
brew install npm git unzip curl || true

# 2. Configure PostgreSQL for Blockscout
echo "Configuring PostgreSQL Database..."
brew services start postgresql || brew services start postgresql@18 || true
sleep 3 # Wait for postgres to start

# Use default user (usually your macOS username) to create the blockscout user/db
psql postgres -c "CREATE USER blockscout WITH PASSWORD 'Passw0Rd';" || true
psql postgres -c "CREATE DATABASE blockscout OWNER blockscout;" || true
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE blockscout TO blockscout;" || true
psql -d blockscout -c "GRANT ALL ON SCHEMA public TO blockscout;" || true
psql postgres -c "ALTER USER blockscout CREATEDB;" || true

# 3. Install ASDF version manager (for Erlang and Elixir)
echo "Installing ASDF and Elixir/Erlang..."
if [ ! -d "$HOME/.asdf" ]; then
  git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.0
fi

# Temporarily source asdf for this script
export PATH="$HOME/.asdf/bin:$HOME/.asdf/shims:$PATH"
. "$HOME/.asdf/asdf.sh"

# Ensure it loads on future server logins (zsh is default on macOS)
if [ -f "$HOME/.zshrc" ] && ! grep -q "asdf.sh" ~/.zshrc; then
  echo -e '\n. "$HOME/.asdf/asdf.sh"' >> ~/.zshrc
fi

if [ -f "$HOME/.bash_profile" ] && [ -w "$HOME/.bash_profile" ] && ! grep -q "asdf.sh" ~/.bash_profile; then
  echo -e '\n. "$HOME/.asdf/asdf.sh"' >> ~/.bash_profile || true
fi

# Add plugins
asdf plugin-add erlang https://github.com/asdf-vm/asdf-erlang.git || true
asdf plugin-add elixir https://github.com/asdf-vm/asdf-elixir.git || true
asdf plugin-add nodejs https://github.com/asdf-vm/asdf-nodejs.git || true

# Navigate to blockscout and install exact versions defined in .tool-versions
cd "./blockscout"

# Install asdf versions
asdf install 

echo "Installing Elixir Hex and Rebar (Package Managers)..."
mix local.hex --force
mix local.rebar --force

echo "Fetching project dependencies..."
mix deps.get

echo "Running Database Migrations..."
mix ecto.create || true
mix ecto.migrate

echo "Installation complete! Blockscout is ready to run."
echo "You can start the server by navigating to the blockscout folder and running: mix phx.server"
