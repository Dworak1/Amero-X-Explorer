#!/bin/bash
set -e

echo "Starting Blockscout Native Dependency Installation..."

export DEBIAN_FRONTEND=noninteractive

# 1. Update and install base requirements
echo "Installing base APT packages..."
sudo apt-get update
sudo apt-get install -y postgresql postgresql-contrib build-essential libssl-dev automake autoconf libncurses5-dev gcc make curl git unzip inotify-tools npm

# 2. Configure PostgreSQL for Blockscout
echo "Configuring PostgreSQL Database..."
sudo systemctl start postgresql
sudo systemctl enable postgresql
sudo -u postgres psql -c "CREATE USER blockscout WITH PASSWORD 'Passw0Rd';" || true
sudo -u postgres psql -c "CREATE DATABASE blockscout OWNER blockscout;" || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE blockscout TO blockscout;" || true
sudo -u postgres psql -c "\c blockscout; GRANT ALL ON SCHEMA public TO blockscout;" || true

# 3. Install ASDF version manager (for Erlang and Elixir)
echo "Installing ASDF and Elixir/Erlang..."
if [ ! -d "$HOME/.asdf" ]; then
  git clone https://github.com/asdf-vm/asdf.git ~/.asdf --branch v0.14.0
fi

# Temporarily source asdf for this script
export PATH="$HOME/.asdf/bin:$HOME/.asdf/shims:$PATH"
. "$HOME/.asdf/asdf.sh"

# Ensure it loads on future server logins
if ! grep -q "asdf.sh" ~/.bashrc; then
  echo 'source "$HOME/.asdf/asdf.sh"' >> ~/.bashrc
fi

# Add plugins
asdf plugin-add erlang https://github.com/asdf-vm/asdf-erlang.git || true
asdf plugin-add elixir https://github.com/asdf-vm/asdf-elixir.git || true
asdf plugin-add nodejs https://github.com/asdf-vm/asdf-nodejs.git || true

# Navigate to blockscout and install exact versions defined in .tool-versions
cd "/root/Amero X MainNet/blockscout"
asdf install 

echo "Installing Elixir Hex and Rebar (Package Managers)..."
mix local.hex --force
mix local.rebar --force

echo "Fetching project dependencies..."
mix deps.get

echo "Running Database Migrations..."
mix ecto.create || true
mix ecto.migrate

echo "Installation complete! You can now start the Blockscout Systemd Service."
