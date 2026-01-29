# Ginásio KO - Sistema de Gestão de Membership

## Problema Original
Sistema completo de gestão para ginásio incluindo gestão de membros, presenças, pagamentos, stock e relatórios.

## Arquitectura
- **Frontend**: React 18 + Tailwind CSS + Shadcn/UI
- **Backend**: FastAPI (Python)
- **Base de Dados**: MongoDB

## Funcionalidades Implementadas

### Core Features
- [x] Autenticação JWT (Admin/Staff)
- [x] Gestão de Membros (CRUD completo)
- [x] Sistema de Check-in (Manual + QR Code preparado)
- [x] Gestão de Modalidades/Actividades
- [x] Pagamentos e Finanças (Receitas, Despesas, Mensalidades)
- [x] Gestão de Stock/Inventário
- [x] Relatórios (Financeiros, Modalidades, Stock)
- [x] Dashboard com estatísticas

### Funcionalidades Recentes (29/01/2026)
- [x] **Gestão de Modalidades**: Eliminadas 8 "Teste Modalidade", adicionada "PT (Treino Personalizado)"
- [x] **Delete Attendance**: Botão de eliminar presença funcional no Dashboard
- [x] **Múltiplos Check-ins**: Sistema permite múltiplos check-ins por membro no mesmo dia
- [x] **Alertas de Aniversário**: Mostra membros que fazem anos hoje
- [x] **Alertas de Renovação**: Mostra membros com aniversário de adesão (para renovação anual)
- [x] **MemberUpdate Model**: Endpoint PUT /members agora aceita actualizações parciais incluindo join_date

## Credenciais de Teste
- **Admin**: fabio.guerreiro / admin123

## Schema da Base de Dados
- **Users**: id, username, email, full_name, role, is_active
- **Members**: id, member_number, name, email, phone, date_of_birth, join_date, status, activity_id
- **Activities**: id, name, color, description, is_active
- **Attendance**: id, member_id, activity_id, check_in_date, check_in_time, method
- **Payments**: id, member_id, amount, payment_date, payment_method, status
- **Expenses/Revenues**: id, category, amount, date, description
- **InventoryItems**: id, name, category, quantity, price, sold_quantity

## API Endpoints Principais
- `POST /api/auth/login` - Autenticação
- `GET/POST /api/members` - Gestão de membros
- `PUT /api/members/{id}` - Actualizar membro (parcial)
- `GET/POST/DELETE /api/attendance` - Gestão de presenças
- `GET/POST/DELETE /api/activities` - Gestão de modalidades
- `DELETE /api/activities/by-name/{name}` - Eliminar modalidades por nome
- `GET/POST /api/payments` - Gestão de pagamentos
- `GET/POST /api/expenses` - Gestão de despesas
- `GET/POST /api/revenues` - Gestão de receitas

## Backlog (P1 - Prioridade Alta)
- [ ] Melhorar comparação ano-a-ano nos relatórios de Modalidades
- [ ] Melhorar comparação ano-a-ano nos relatórios de Stock

## Backlog (P2 - Prioridade Média)
- [ ] Implementar notificações de expiração de membership
- [ ] Integração QR Code na app móvel
- [ ] Exportação de relatórios em PDF

## Ficheiros Principais
- `/app/backend/server.py` - API principal
- `/app/frontend/src/pages/Dashboard.js` - Painel principal
- `/app/frontend/src/pages/Payments.js` - Gestão financeira
- `/app/frontend/src/pages/Members.js` - Gestão de membros
- `/app/frontend/src/pages/Reports.js` - Relatórios
