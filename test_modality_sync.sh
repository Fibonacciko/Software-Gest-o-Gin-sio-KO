#!/bin/bash

BACKEND_URL=$(grep REACT_APP_BACKEND_URL /app/frontend/.env | cut -d '=' -f2)
API="${BACKEND_URL}/api"

echo "=== Teste de Sincronia: Modalidade -> Pagamento -> Relatório ==="
echo "Backend URL: $API"
echo ""

# 1. Buscar atividades
echo "1. Buscando atividades..."
ACTIVITIES=$(curl -s "${API}/activities")
echo "Atividades disponíveis:"
echo "$ACTIVITIES" | python3 -m json.tool 2>/dev/null || echo "$ACTIVITIES"
echo ""

# Extrair ID da atividade "Boxe"
BOXE_ID=$(echo "$ACTIVITIES" | python3 -c "import json, sys; data=json.load(sys.stdin); print(next((a['id'] for a in data if a['name']=='Boxe'), None))" 2>/dev/null)
echo "ID da atividade Boxe: $BOXE_ID"
echo ""

# 2. Criar um membro de teste com modalidade Boxe
echo "2. Criando membro de teste com modalidade Boxe..."
MEMBER_DATA='{
  "name": "Teste Modalidade",
  "email": "teste.modalidade@gym.com",
  "phone": "912345678",
  "date_of_birth": "1990-01-01",
  "gender": "male",
  "activity_id": "'$BOXE_ID'",
  "status": "active"
}'

MEMBER_RESPONSE=$(curl -s -X POST "${API}/members" \
  -H "Content-Type: application/json" \
  -d "$MEMBER_DATA")

echo "Resposta da criação do membro:"
echo "$MEMBER_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$MEMBER_RESPONSE"
echo ""

MEMBER_ID=$(echo "$MEMBER_RESPONSE" | python3 -c "import json, sys; data=json.load(sys.stdin); print(data.get('id', ''))" 2>/dev/null)
echo "ID do membro criado: $MEMBER_ID"
echo ""

# 3. Criar pagamento de mensalidade
echo "3. Criando pagamento de mensalidade..."
PAYMENT_DATA='{
  "member_id": "'$MEMBER_ID'",
  "amount": 50.00,
  "payment_method": "membership",
  "description": "Mensalidade Teste Boxe",
  "payment_date": "2025-10-09",
  "status": "paid"
}'

PAYMENT_RESPONSE=$(curl -s -X POST "${API}/payments" \
  -H "Content-Type: application/json" \
  -d "$PAYMENT_DATA")

echo "Resposta da criação do pagamento:"
echo "$PAYMENT_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$PAYMENT_RESPONSE"
echo ""

# 4. Verificar pagamentos de mensalidade
echo "4. Verificando pagamentos de mensalidade..."
PAYMENTS=$(curl -s "${API}/payments")
MEMBERSHIP_PAYMENTS=$(echo "$PAYMENTS" | python3 -c "import json, sys; data=json.load(sys.stdin); print(json.dumps([p for p in data if p.get('payment_method')=='membership'], indent=2))" 2>/dev/null)
echo "Pagamentos de mensalidade:"
echo "$MEMBERSHIP_PAYMENTS"
echo ""

echo "=== Teste Concluído ==="
echo "Agora vá para a página de Relatórios > Modalidades para verificar se o gráfico foi atualizado"
