#!/bin/bash
# load-env.sh - Load variables from .env file and export them

# Default .env file path (current directory)
ENV_FILE="${1:-.env}"

# Check if file exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Error: Environment file '$ENV_FILE' not found!"
    exit 1
fi

echo "Loading environment variables from $ENV_FILE..."

# Read each line from .env file
while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and empty lines
    if [[ $line =~ ^[[:space:]]*# ]] || [[ -z "${line// }" ]]; then
        continue
    fi
    
    # Remove inline comments
    line=$(echo "$line" | sed 's/[[:space:]]*#.*$//')
    
    # Trim whitespace
    line=$(echo "$line" | xargs)
    
    # Skip if empty after comment removal
    if [ -z "$line" ]; then
        continue
    fi
    
    # Extract variable name and value
    if [[ $line =~ ^([^=]+)=(.*)$ ]]; then
        var_name="${BASH_REMATCH[1]}"
        var_value="${BASH_REMATCH[2]}"
        
        # Remove quotes if present
        var_value=$(echo "$var_value" | sed -E 's/^"(.*)"$/\1/')
        var_value=$(echo "$var_value" | sed -E "s/^'(.*)'$/\1/")
        
        # Export the variable
        export "$var_name"="$var_value"
        echo "Exported: $var_name"
    fi
done < "$ENV_FILE"

echo "Environment variables loaded successfully!"