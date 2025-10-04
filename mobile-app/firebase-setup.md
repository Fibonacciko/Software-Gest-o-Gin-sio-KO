# Firebase Setup Guide

## Passo 1: Criar Projeto Firebase

1. Vá a https://console.firebase.google.com
2. Clique em "Adicionar projeto"
3. Nome do projeto: "Gym Manager" (ou nome de sua escolha)
4. Ative Google Analytics (opcional)

## Passo 2: Configurar Cloud Messaging (FCM)

1. No console Firebase, vá para "Project Settings" (ícone de engrenagem)
2. Aba "Cloud Messaging"
3. Anote o "Server key" - necessário para backend

## Passo 3: Adicionar Apps

### Para Android:
1. Clique "Add app" → Android
2. Package name: `com.yourcompany.gymmanager` (mesmo do app.config.js)
3. Download do `google-services.json`
4. Colocar arquivo na pasta root da app React Native

### Para iOS:
1. Clique "Add app" → iOS  
2. Bundle ID: `com.yourcompany.gymmanager` (mesmo do app.config.js)
3. Download do `GoogleService-Info.plist`
4. Colocar arquivo na pasta root da app React Native

## Passo 4: Service Account (Backend)

1. Project Settings → Service Accounts
2. Clique "Generate new private key"
3. Download do arquivo JSON
4. Salvar como `/app/backend/firebase-service-account.json`
5. Adicionar ao `.env` do backend:
   ```
   FIREBASE_CONFIG_PATH=/app/backend/firebase-service-account.json
   ```

## Passo 5: Verificar Configuração

### No Backend:
- Arquivo `firebase-service-account.json` presente
- Variável `FIREBASE_CONFIG_PATH` no `.env`
- Reiniciar backend: `sudo supervisorctl restart backend`
- Verificar logs: Firebase deve inicializar com sucesso

### Na App Mobile:
- `google-services.json` (Android) na pasta root
- `GoogleService-Info.plist` (iOS) na pasta root  
- Configuração `app.config.js` com paths corretos

## Passo 6: Testar Push Notifications

1. Fazer login na app mobile
2. App deve registrar FCM token automaticamente
3. Enviar mensagem via painel web admin
4. Verificar se notification aparece no dispositivo

## Estrutura Final de Arquivos:

```
/app/
├── backend/
│   ├── firebase-service-account.json  ← Service account
│   └── .env (com FIREBASE_CONFIG_PATH)
├── mobile-app/
│   ├── google-services.json          ← Android config
│   ├── GoogleService-Info.plist      ← iOS config
│   └── app.config.js                 ← Expo config
```

## Troubleshooting

### Backend não encontra Firebase config:
- Verificar se path no `.env` está correto
- Verificar permissões do arquivo JSON
- Reiniciar backend após mudanças

### App mobile não recebe notifications:
- Verificar se FCM token está sendo registrado
- Testar envio manual via Firebase Console
- Verificar logs do backend para erros de envio

### Build falha:
- Verificar se arquivos de configuração estão na pasta correta
- Verificar package names/bundle IDs são consistentes
- Limpar cache: `expo r -c`