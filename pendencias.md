# ⏳ Pendências e Próximos Passos

## ✅ CORREÇÕES CRÍTICAS IMPLEMENTADAS

### #1 - Motivo de Rejeição nos Cards ✅
**Status:** Implementado  
**Arquivo:** `src/pages/Admin/AdminSubmissionList.tsx`  
**Mudança:** Movido bloco de exibição do motivo de rejeição para dentro da div `flex-1` (agora aparece corretamente no card)

**Como testar:**
1. Reprovar uma submissão com motivo específico
2. Verificar que caixa vermelha aparece no card da submissão
3. Verificar que texto do motivo está legível
4. Testar em mobile (responsividade)

---

### #2 - Campo de Busca Sempre Visível ✅
**Status:** Implementado  
**Arquivo:** `src/pages/Admin/AdminFilters.tsx`  
**Mudança:** Removida condição que escondia campo de busca quando nenhum evento estava selecionado

**Como testar:**
1. Abrir painel admin sem selecionar evento
2. Verificar que campo de busca está visível e funcional
3. Digitar nome de usuário
4. Verificar que resultados aparecem
5. Selecionar um evento e verificar que busca continua funcionando

---

### #3 - Correção de Posts do Evento XXXperience ✅
**Status:** Implementado  
**Arquivos:** `src/pages/Admin.tsx`  
**Mudança:** Função `getAvailablePostNumbers()` agora busca posts diretamente dos dados carregados do evento via `useEventsQuery` com `includePosts: true`, ao invés de usar o array de submissões filtradas

**Como testar:**
1. Selecionar evento "XXXperience" no painel admin
2. Verificar que select de posts mostra **TODOS os 5 posts** (1, 2, 3, 4, 5)
3. Selecionar cada post individualmente
4. Verificar que submissões aparecem para cada post
5. Verificar console logs:
   - `📋 Posts disponíveis para evento [id]:` deve mostrar `[1, 2, 3, 4, 5]`
   - Se não aparecer todos, verificar se evento tem posts cadastrados no banco

**Diagnóstico adicional:**
- Abrir console do navegador
- Procurar por: `🔍 [Admin Debug] Total de posts carregados:`
- Deve mostrar número total de posts carregados
- Procurar por: `📋 Posts disponíveis para evento`
- Deve listar todos os números de posts do evento selecionado

---

## 🔄 PRÓXIMOS PASSOS - PWA e Push Notifications

### 📱 ITEM #6: Detecção de Plataforma Mobile + Instruções iOS

**Objetivo:** Detectar quando usuário está no iOS e não tem PWA instalado, mostrando toast com instruções de como instalar para receber push notifications.

**Arquivos a modificar:**
- `src/hooks/usePushNotifications.ts`

**Implementação:**
```typescript
// Adicionar no início da função subscribe(), após linha 100:

const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isAndroid = /Android/i.test(navigator.userAgent);
const isPWA = window.matchMedia('(display-mode: standalone)').matches || 
              (window.navigator as any).standalone === true;

console.log('📱 [Push] Plataforma:', { 
  isMobile, 
  isIOS, 
  isAndroid, 
  isPWA,
  userAgent: navigator.userAgent 
});

// Se for iOS sem PWA instalado, mostrar toast com instruções
if (isIOS && !isPWA) {
  toast.warning('Notificações no iOS', {
    description: 'Para receber notificações no iPhone/iPad:\n1. Toque no botão 📤 (compartilhar)\n2. "Adicionar à Tela Inicial"\n3. Abra o app pela tela inicial',
    duration: 10000
  });
  setLoading(false);
  return false;
}
```

**Benefícios:**
- Melhora UX ao educar usuários iOS
- Evita frustração de tentar ativar notificações que não funcionarão
- Detecta automaticamente plataforma e estado do PWA

**Testes:**
- [ ] Testar em Chrome Android (deve funcionar normalmente)
- [ ] Testar em Safari iOS sem PWA (deve mostrar toast)
- [ ] Testar em Safari iOS com PWA instalado (não deve mostrar toast)
- [ ] Verificar logs no console

**Complexidade:** 3/10  
**Risco:** Baixo  
**Tempo estimado:** 10 minutos

---

### 🔍 ITEM #7: Página de Diagnóstico Automático

**Objetivo:** Criar página `/push-diagnostic` que executa automaticamente uma bateria de testes e mostra resultados visuais sobre o estado das push notifications.

**Arquivo a criar:**
- `src/pages/PushDiagnostic.tsx`

**Implementação:**

Página deve executar os seguintes checks automaticamente:
1. ✅ Suporte do navegador (`serviceWorker in navigator && PushManager in window`)
2. ✅ Service Worker registrado e ativo
3. ✅ VAPID Key configurada e válida (87-88 caracteres)
4. ✅ Permissão de notificações (granted/denied/default)
5. ✅ Subscription ativa no PushManager
6. ✅ Detecção de plataforma (iOS/Android/Desktop)
7. ✅ PWA Status (apenas para iOS)

**UI esperada:**
- Card com lista de checks
- Ícones coloridos por status:
  - 🟢 CheckCircle (verde) = Sucesso
  - 🔴 XCircle (vermelho) = Erro
  - 🟡 AlertCircle (amarelo) = Aviso
  - ⚪ Loader (cinza) = Carregando
- Badge com status (success/error/warning/pending)
- Detalhes expandíveis (endpoint, user-agent, etc.)
- Botão "Executar Novamente"
- Resumo no final com recomendações

**Adicionar rota:**
```typescript
// Em src/App.tsx:
<Route path="/push-diagnostic" element={<PushDiagnostic />} />
```

**Benefícios:**
- Debug mais rápido de problemas de push
- Usuários podem compartilhar screenshot dos resultados
- Identifica rapidamente onde está a falha
- Reduz tickets de suporte

**Testes:**
- [ ] Acessar `/push-diagnostic`
- [ ] Verificar que todos os checks executam automaticamente
- [ ] Verificar cores corretas dos badges
- [ ] Clicar em "Executar Novamente"
- [ ] Testar em diferentes plataformas (Android, iOS, Desktop)
- [ ] Verificar resumo e recomendações no final

**Complexidade:** 6/10  
**Risco:** Baixo (página isolada, não afeta outros componentes)  
**Tempo estimado:** 25 minutos

---

### 📊 ITEM #8: Logs Detalhados em usePushNotifications.ts

**Objetivo:** Adicionar logs estratégicos e agrupados no hook de push notifications para facilitar debug em produção.

**Arquivo a modificar:**
- `src/hooks/usePushNotifications.ts`

**Implementação:**

Adicionar `console.group` e `console.log` em pontos estratégicos:

```typescript
// 1. No início do subscribe() - linha ~100
console.group('🔔 [Push] Iniciando subscription');
console.log('🕐 Timestamp:', new Date().toISOString());
console.log('👤 User ID:', user?.id);
console.log('📱 Platform:', {
  isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
  isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
  isAndroid: /Android/i.test(navigator.userAgent),
  isPWA: window.matchMedia('(display-mode: standalone)').matches,
  userAgent: navigator.userAgent
});
console.groupEnd();

// 2. Após solicitar permissão - linha ~110
console.group('🔔 [Push] Permissão solicitada');
console.log('✅ Resultado:', permissionResult);
console.log('🕐 Tempo decorrido:', (Date.now() - startTime) + 'ms');
console.groupEnd();

// 3. Após obter Service Worker - linha ~115
console.group('🔔 [Push] Service Worker');
console.log('✅ Registration:', registration);
console.log('📍 Scope:', registration.scope);
console.log('🔗 Active:', registration.active?.scriptURL);
console.log('🔗 State:', registration.active?.state);
console.groupEnd();

// 4. Após converter VAPID key - linha ~120
console.group('🔔 [Push] VAPID Key');
console.log('🔐 Key Length:', convertedKey.byteLength, 'bytes');
console.log('🔐 First 10 bytes:', Array.from(convertedKey.slice(0, 10)));
console.log('✅ Valid:', convertedKey.byteLength === 65);
console.groupEnd();

// 5. Após criar subscription - linha ~130
console.group('🔔 [Push] Subscription criada');
console.log('✅ Subscription:', subscription);
console.log('📡 Endpoint:', subscription.endpoint.substring(0, 100) + '...');
console.log('🔑 Keys:', subscriptionJSON.keys);
console.log('🕐 Tempo total:', (Date.now() - startTime) + 'ms');
console.groupEnd();

// 6. Em caso de erro
console.group('❌ [Push] Erro');
console.error('Erro completo:', error);
console.log('📍 Onde ocorreu:', 'subscribe()');
console.log('🕐 Timestamp:', new Date().toISOString());
console.groupEnd();
```

**Benefícios:**
- Facilita debug remoto
- Logs agrupados e organizados
- Usuários podem copiar logs e enviar
- Identifica rapidamente em qual etapa falha
- Informações de plataforma e timing

**Testes:**
- [ ] Abrir console do navegador
- [ ] Ativar notificações push
- [ ] Verificar que logs agrupados aparecem
- [ ] Verificar informações de plataforma
- [ ] Forçar um erro e verificar que é logado corretamente
- [ ] Verificar timing de cada etapa

**Complexidade:** 2/10  
**Risco:** Muito Baixo (apenas adiciona logs)  
**Tempo estimado:** 5 minutos

---

## 📋 RESUMO DO PRÓXIMO SPRINT PWA

| Item | Descrição | Arquivo(s) | Tempo | Prioridade |
|------|-----------|-----------|-------|------------|
| #6 | Detecção mobile iOS | usePushNotifications.ts | 10 min | 🟡 ALTA |
| #7 | Página diagnóstico push | PushDiagnostic.tsx (novo) | 25 min | 🟡 ALTA |
| #8 | Logs detalhados push | usePushNotifications.ts | 5 min | 🟢 MÉDIA |

**Total Estimado:** ~40 minutos  
**Risco Geral:** Baixo  
**Impacto:** Alto (melhor UX e facilita debug)

**Ordem Sugerida:**
1. **#8** - Logs detalhados (5 min) → Facilita debug dos próximos itens
2. **#6** - Detecção mobile (10 min) → Melhora UX imediatamente
3. **#7** - Página diagnóstico (25 min) → Ferramenta completa de debug

---

## 🧪 ITEM #4: Auto-preencher Email da Ticketeira

**Status:** ✅ Já implementado, aguardando teste

**Código implementado em:**
- `src/pages/Submit.tsx` linha 119 (inicialização do localStorage)
- `src/pages/Submit.tsx` linha 173 (manter valor ao trocar evento)
- `src/pages/Submit.tsx` linha 1092 (salvar no localStorage após submissão)

**Como testar:**
1. Ir para página `/submit`
2. Selecionar evento que tem ticketeira configurada (ex: "Circoloco")
3. Preencher campo "E-mail para Ticketeira" com `teste@exemplo.com`
4. Enviar submissão
5. Enviar NOVA submissão (mesmo evento ou diferente)
6. **Resultado esperado:** Campo deve aparecer pré-preenchido com `teste@exemplo.com`
7. **Se trocar de evento:** Email deve permanecer (não ser limpo)

---

## ✅ ITEM #5: Eventos Ativos em Push Notifications

**Status:** ✅ Já implementado e funcionando

**Código implementado em:**
- `src/components/NotificationPreferences.tsx` linha 31 (filtro `is_active: true`)

**Sem ação necessária**

---

## 📌 NOTAS IMPORTANTES

### Sobre Push Notifications no iOS:
⚠️ **LIMITAÇÃO CRÍTICA:** Web Push no iOS **SÓ FUNCIONA** se:
1. ✅ iOS 16.4 ou superior
2. ✅ App instalado como PWA ("Add to Home Screen")
3. ✅ App aberto VIA Home Screen (não pelo Safari direto)

Se qualquer um desses requisitos não for atendido, push notifications **NÃO funcionarão** no iOS.

### Como verificar se está configurado corretamente:
```javascript
// No console mobile (iOS)
console.log('iOS Version:', /OS (\d+)_/.exec(navigator.userAgent)?.[1]);
console.log('Is Standalone:', window.navigator.standalone);
console.log('Display Mode:', window.matchMedia('(display-mode: standalone)').matches);
console.log('Push Supported:', 'PushManager' in window);

// Todos devem retornar true (exceto versão que deve ser >= 16)
```

### Links Úteis:
- [Web Push for Web Apps on iOS - Apple](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)
- [Can I Use - Push API](https://caniuse.com/push-api)
- [MDN - Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

---

**Última atualização:** 2025-01-14  
**Próxima revisão:** Após implementação dos itens #6, #7, #8
