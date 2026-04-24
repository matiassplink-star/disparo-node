#!/bin/bash
# Checklist de Instalação e Deploy - SaaS Admin Dashboard

echo "=========================================="
echo "  SaaS Admin Dashboard - Checklist"
echo "=========================================="
echo ""

# Verificar Node.js
echo "1. Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "   ✅ Node.js instalado: $NODE_VERSION"
else
    echo "   ❌ Node.js NÃO encontrado. Instale em https://nodejs.org"
    exit 1
fi

# Verificar npm
echo ""
echo "2. Verificando npm..."
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "   ✅ npm instalado: $NPM_VERSION"
else
    echo "   ❌ npm NÃO encontrado"
    exit 1
fi

# Verificar node_modules
echo ""
echo "3. Verificando dependencies..."
if [ -d "node_modules" ]; then
    echo "   ✅ node_modules encontrado"
else
    echo "   ⚠️  node_modules não encontrado"
    echo "   → Execute: npm install"
fi

# Verificar .env.local
echo ""
echo "4. Verificando configurações..."
if [ -f ".env.local" ]; then
    echo "   ✅ .env.local encontrado"
    
    # Verificar variáveis importantes
    if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
        echo "   ✅ NEXT_PUBLIC_SUPABASE_URL configurado"
    else
        echo "   ❌ NEXT_PUBLIC_SUPABASE_URL não encontrado"
    fi
    
    if grep -q "SUPABASE_SERVICE_ROLE_KEY" .env.local; then
        echo "   ✅ SUPABASE_SERVICE_ROLE_KEY configurado"
    else
        echo "   ❌ SUPABASE_SERVICE_ROLE_KEY não encontrado"
    fi
    
    if grep -q "RESEND_API_KEY" .env.local; then
        echo "   ✅ RESEND_API_KEY configurado"
    else
        echo "   ❌ RESEND_API_KEY não encontrado"
    fi
else
    echo "   ❌ .env.local NÃO encontrado"
    echo "   → Execute: cp .env.example .env.local"
    echo "   → Edite com suas credenciais"
fi

# Verificar tabelas Supabase
echo ""
echo "5. Verificando banco de dados..."
echo "   ℹ️  Confirme manualmente no Supabase:"
echo "   → Settings > SQL Editor"
echo "   → Verifique se as tabelas 'users' e 'accounts' existem"

# Sumarizar próximos passos
echo ""
echo "=========================================="
echo "  Próximos Passos"
echo "=========================================="
echo ""
echo "1. Complete as variáveis de ambiente (.env.local)"
echo "2. Crie as tabelas no Supabase (ver SETUP.md)"
echo "3. Execute: npm run dev"
echo "4. Acesse: http://localhost:3000"
echo ""
echo "=========================================="
echo "  Testes Rápidos"
echo "=========================================="
echo ""
echo "1. TypeScript:"
echo "   npm run type-check"
echo ""
echo "2. Linter:"
echo "   npm run lint"
echo ""
echo "3. Build:"
echo "   npm run build"
echo ""
echo "=========================================="
echo "✨ Dashboard Admin SaaS Pronto!"
echo "=========================================="
