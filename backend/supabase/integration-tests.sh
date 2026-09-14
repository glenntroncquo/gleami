#!/bin/bash

echo "Starting integration tests...🚀"

# Start Supabase and capture output
output=$(supabase start)
echo "$output"

# Extract anon key from the captured output
anon_key=$(echo "$output" | grep 'anon key:' | awk '{print $NF}')
echo "Anon key is: $anon_key"

# Update .env file with the new anon key
if [ -f ".env" ]; then
    # Update existing SUPABASE_ANON_KEY line (macOS compatible)
    sed -i '' "s/SUPABASE_ANON_KEY=.*/SUPABASE_ANON_KEY=$anon_key/" .env
    echo "Updated .env file with new anon key"
else
    # Create .env file if it doesn't exist
    cat > .env << EOF
SUPABASE_ANON_KEY=$anon_key
SUPABASE_URL=http://localhost:54321
EOF
    echo "Created .env file with anon key"
fi

# Run tests
npm run test:integration

# Stop Supabase
supabase stop --no-backup