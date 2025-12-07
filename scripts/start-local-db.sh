#!/bin/bash

# Script para iniciar Supabase local con Colima
# Resuelve incompatibilidades conocidas entre Supabase CLI y Colima

set -e

echo "🐳 Verificando Colima..."
if ! colima status &>/dev/null; then
    echo "   Iniciando Colima..."
    colima start
else
    echo "   Colima ya está corriendo"
fi

echo ""
echo "🚀 Iniciando Supabase local..."
echo "   (edge_runtime y analytics deshabilitados por compatibilidad con Colima)"
echo ""

npx supabase start

echo ""
echo "✅ Supabase local listo"
echo ""
echo "Para detener: npx supabase stop"
echo "Para resetear BD: npx supabase db reset"
