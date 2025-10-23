#!/bin/bash
# Setup script for Supabase database connection

echo "🔧 Supabase Setup Helper"
echo "========================"
echo ""
echo "Your Supabase project: xsdhkjiskqfelahfariv"
echo "Region: aws-0-us-east-1"
echo ""
echo "📝 Steps to complete setup:"
echo ""
echo "1. Go to: https://app.supabase.com/project/xsdhkjiskqfelahfariv/settings/database"
echo "2. Find your database password (or reset it)"
echo "3. Copy the password"
echo ""
read -p "Enter your Supabase database password: " -s DB_PASSWORD
echo ""

if [ -z "$DB_PASSWORD" ]; then
    echo "❌ Error: Password cannot be empty"
    exit 1
fi

# Update .env file
cd "$(dirname "$0")"

# Create backup of .env
cp .env .env.backup

# Update DATABASE_URL and DIRECT_URL
sed -i.tmp "s/\[YOUR_DB_PASSWORD\]/$DB_PASSWORD/g" .env
rm -f .env.tmp

echo ""
echo "✅ .env file updated successfully!"
echo "📁 Backup saved as .env.backup"
echo ""
echo "🚀 Next steps:"
echo ""
echo "1. Generate Prisma client:"
echo "   npx prisma generate"
echo ""
echo "2. Run migrations:"
echo "   npx prisma migrate deploy"
echo ""
echo "3. Seed the database:"
echo "   npm run prisma:seed"
echo ""
echo "4. Start the server:"
echo "   npm run dev"
echo ""
echo "🔒 Security tip: Never commit .env file to git!"
