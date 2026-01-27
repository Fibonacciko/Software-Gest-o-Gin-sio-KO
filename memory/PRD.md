# Ginásio KO - Product Requirements Document

## Descrição do Produto
Sistema de gestão completo para ginásio, incluindo gestão de membros, presenças, finanças, inventário e relatórios.

## Funcionalidades Principais

### 1. Gestão de Membros
- CRUD completo de membros
- Números de membro automáticos
- Fotos e QR codes
- Status (ativo/inativo)
- Notas pessoais e médicas

### 2. Presenças (Check-in)
- Check-in manual e por QR code
- Histórico de presenças por modalidade
- Calendário de presenças por membro
- Múltiplos check-ins por dia permitidos

### 3. Finanças
- **Mensalidades**: Registo e consulta de pagamentos
- **Receitas**: Gestão de receitas extras (personal training, subsídios, etc.)
- **Despesas**: Gestão de despesas (rendas, energia, manutenção, etc.)
- Atualização automática de status do membro após pagamento

### 4. Inventário (Stock)
- Gestão de artigos têxteis e equipamento
- Registo de vendas
- Rastreamento de quantidades vendidas
- Preços de compra e venda

### 5. Relatórios
- **Relatório Financeiro**: Receitas, despesas, lucro líquido
- **Relatório de Modalidades**: Presenças por modalidade
- **Relatório de Stock**: Artigos em stock, valor investido, valor vendido
- Comparação ano-a-ano com percentagens de crescimento
- Projeções e alertas

### 6. Dashboard (Painel Principal)
- Estatísticas diárias
- Check-in rápido
- **Alertas de aniversários** (membros que fazem anos hoje)
- **Alertas de aniversário de adesão** (membros com 1+ anos de adesão)

### 7. Utilizadores
- Roles: Admin e Staff
- Gestão de utilizadores (apenas Admin)

## Tecnologias
- **Frontend**: React, Tailwind CSS, Chart.js, Shadcn/UI
- **Backend**: FastAPI (Python)
- **Base de Dados**: MongoDB
- **Autenticação**: JWT

## Histórico de Alterações

### 2026-01-27
- ✅ Corrigido bug nos alertas do Dashboard (campo `membership_start` → `join_date`)
- ✅ Criado endpoint GET /api/sales para consulta de vendas
- ✅ Corrigido cálculo de "Valor Vendido" no relatório de Stock (usa dados de vendas por período)
- ✅ Verificado que registo de pagamentos funciona corretamente

### Correções Anteriores
- ✅ Implementada comparação ano-a-ano em todos os relatórios
- ✅ Corrigida eliminação de pagamentos (atualiza status do membro)
- ✅ Permitidos múltiplos check-ins diários
- ✅ Implementado endpoint DELETE /api/attendance/{id}
- ✅ Diálogo "Consultar Mensalidades" implementado
- ✅ Visibilidade de "Consultar Despesas" para Staff ajustada

## Tarefas Pendentes

### P2 - Futuras
- Integração de check-in por QR code com app móvel
- Lembretes de expiração de mensalidades via app/SMS

## Credenciais de Teste
- **Admin**: fabio.guerreiro / admin123

## Arquitetura de Ficheiros
```
/app/
├── backend/
│   ├── server.py          # API FastAPI
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.js
│   │   │   ├── Payments.js
│   │   │   ├── Reports.js
│   │   │   ├── Inventory.js
│   │   │   └── ...
│   │   └── components/
│   └── package.json
└── memory/
    └── PRD.md
```
