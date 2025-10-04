# Gym Management Mobile App

## Descrição
Aplicação mobile nativa (React Native) para membros do ginásio.

## Funcionalidades Implementadas

### ✅ Autenticação
- Login com número de membro e telefone
- Gestão de sessões com JWT

### ✅ Perfil do Membro
- Visualização e edição de dados pessoais
- Upload de foto de perfil
- QR Code único para check-in

### ✅ Sistema de Check-in
- QR Code scan para check-in automático
- Seleção de modalidade/atividade
- Histórico de treinos

### ✅ Mensagens e Notificações
- Push notifications via Firebase FCM
- Mensagens gerais e individuais
- Sistema de notificações bilíngue (PT/EN)

### ✅ Notas Motivacionais
- Mensagens baseadas no número de treinos
- 5 níveis: iniciante, em progresso, criando hábito, comprometido, campeão
- Suporte bilíngue

### ✅ Sistema de Pagamentos (Mock)
- Interface para pagamentos futuros
- Suporte MBWay, Visa, Multibanco
- Atualmente inoperacional (conforme solicitado)

## Tecnologias
- **React Native** - Framework mobile
- **Firebase FCM** - Push notifications
- **AsyncStorage** - Armazenamento local
- **React Navigation** - Navegação
- **Camera/QR Scanner** - Leitura de QR codes

## APIs Backend Disponíveis

### Autenticação
- `POST /api/mobile/auth/login` - Login mobile

### Perfil
- `GET /api/mobile/profile` - Obter perfil
- `PUT /api/mobile/profile/{member_id}` - Atualizar perfil

### Check-in
- `GET /api/mobile/activities` - Listar atividades
- `POST /api/mobile/checkin` - Fazer check-in
- `GET /api/mobile/attendance/{member_id}` - Histórico

### Mensagens
- `GET /api/mobile/messages/{member_id}` - Obter mensagens
- `POST /api/mobile/messages/{message_id}/read/{member_id}` - Marcar como lida

### Notificações
- `POST /api/mobile/fcm-token/{member_id}` - Atualizar token FCM

### Pagamentos (Mock)
- `POST /api/mobile/payments/mock` - Tentar pagamento (retorna mensagem de indisponibilidade)

## Setup Firebase

Para implementar as push notifications, será necessário:

1. **Criar projeto Firebase** em https://console.firebase.google.com
2. **Configurar FCM** para Android/iOS
3. **Download do arquivo de configuração** 
   - `google-services.json` (Android)
   - `GoogleService-Info.plist` (iOS)
4. **Configurar backend** com service account JSON

## Próximos Passos

Para completar a implementação da app mobile:

1. **Configuração Firebase** - Criar projeto e configurar FCM
2. **Desenvolvimento React Native** - Implementar todas as telas
3. **Integração APIs** - Conectar com backend expandido
4. **Testes** - Validar funcionalidades
5. **Build & Deploy** - Gerar APKs/IPAs para distribuição

## Estado Atual

✅ **Backend expandido** com todas as APIs mobile
✅ **Sistema de mensagens** e push notifications
✅ **Notas motivacionais** implementadas
✅ **QR codes** melhorados para mobile
🔄 **Aplicação React Native** - Próximo passo