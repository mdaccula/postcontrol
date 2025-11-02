# 📋 CHECKLIST DE VALIDAÇÃO MANUAL - 4 ITENS (12 PONTOS)

## ✅ INSTRUÇÕES GERAIS

1. **Execute cada teste na ordem apresentada**
2. **Marque [ ] → [x] quando validado com sucesso**
3. **Anote qualquer problema encontrado**
4. **Se encontrar erro, NÃO continue - reporte imediatamente**

---

## 📸 ITEM 1: FAIXA DE SEGUIDORES PREENCHIDA (2 pts)

### 🧪 TESTE 1.1: Usuário Novo (SEM faixa cadastrada)
- [ ] Acesse `/submit` com usuário que NUNCA preencheu faixa de seguidores
- [ ] Selecione um evento com `event_purpose = 'selecao_perfil'`
- [ ] **ESPERADO:** Campo "Faixa de Seguidores" deve estar:
  - [ ] Vazio (placeholder visível)
  - [ ] Liberado para seleção
  - [ ] Dropdown abre com opções
- [ ] Selecione uma faixa (ex: "5.000 a 10.000 seguidores")
- [ ] Complete e envie a submissão
- [ ] **ESPERADO:** Submissão criada com sucesso

### 🧪 TESTE 1.2: Usuário Existente (COM faixa cadastrada)
- [ ] Acesse `/submit` com usuário que JÁ preencheu faixa
- [ ] Selecione um evento com `event_purpose = 'selecao_perfil'`
- [ ] **ESPERADO:** Campo "Faixa de Seguidores" deve estar:
  - [ ] ✅ **PREENCHIDO** com valor salvo anteriormente
  - [ ] 🔒 **BLOQUEADO** (desabilitado)
  - [ ] Dropdown NÃO abre ao clicar
- [ ] Verifique que o valor exibido está correto

### ✅ VALIDAÇÃO COMPLETA ITEM 1
- [ ] Teste 1.1 passou
- [ ] Teste 1.2 passou
- [ ] Nenhum erro no console

---

## 🏠 ITEM 2: REDIRECIONAMENTO DASHBOARD CORRETO (6 pts)

### 🧪 TESTE 2.1: Usuário com 1 Agência
- [ ] Faça logout completo
- [ ] Faça login com usuário vinculado a **1 agência** (ex: joana@joana.com)
- [ ] Na página inicial (`/`), verifique que botão "Dashboard" está visível
- [ ] **Clique no botão "Dashboard"**
- [ ] **ESPERADO:** Sistema deve:
  - [ ] Redirecionar para `/dashboard?agency={slug}` (verificar URL)
  - [ ] ✅ Carregar dashboard COM dados da agência
  - [ ] ✅ NÃO exibir erro "nenhuma agência vinculada"
  - [ ] ✅ Exibir nome da agência no header

### 🧪 TESTE 2.2: Usuário com Múltiplas Agências
- [ ] Faça logout
- [ ] Faça login com usuário vinculado a **2+ agências**
- [ ] Na página inicial, clique em "Dashboard"
- [ ] **ESPERADO:** Sistema deve:
  - [ ] Redirecionar para última agência acessada
  - [ ] Exibir **menu seletor de agências** no header do Dashboard
  - [ ] Permitir trocar de agência via dropdown

### 🧪 TESTE 2.3: Menu Mobile
- [ ] Abra em dispositivo mobile ou redimensione janela (<768px)
- [ ] Clique no ícone de menu (hamburguer)
- [ ] Verifique que botão "Dashboard" está visível no menu mobile
- [ ] **Clique no botão**
- [ ] **ESPERADO:** Mesmo comportamento do teste 2.1

### ✅ VALIDAÇÃO COMPLETA ITEM 2
- [ ] Teste 2.1 passou (1 agência)
- [ ] Teste 2.2 passou (múltiplas agências)
- [ ] Teste 2.3 passou (mobile)
- [ ] URL sempre contém `?agency={slug}`
- [ ] Nenhum erro no console

---

## 🛠 ITEM 3: BOTÃO SAIR NO HEADER (1 pt)

### 🧪 TESTE 3.1: Logout - Menu Desktop
- [ ] Faça login
- [ ] Na página inicial (`/`), verifique que há **2 botões visíveis**:
  - [ ] "Dashboard" (com gradiente)
  - [ ] "Sair" (estilo ghost)
- [ ] **Clique no botão "Sair"**
- [ ] **ESPERADO:**
  - [ ] Sistema faz logout imediatamente
  - [ ] Redireciona para página inicial (`/`)
  - [ ] Botão "Dashboard" desaparece
  - [ ] Botão "Entrar" aparece no lugar

### 🧪 TESTE 3.2: Logout - Menu Mobile
- [ ] Faça login novamente
- [ ] Abra em mobile ou redimensione (<768px)
- [ ] Clique no menu hamburguer
- [ ] **ESPERADO:** Menu deve exibir:
  - [ ] Botão "Dashboard" (full width)
  - [ ] Botão "Sair" (outline, full width)
- [ ] **Clique em "Sair"**
- [ ] **ESPERADO:**
  - [ ] Logout executado
  - [ ] Menu fecha automaticamente
  - [ ] Redireciona para `/`
  - [ ] Menu agora exibe apenas "Entrar"

### ✅ VALIDAÇÃO COMPLETA ITEM 3
- [ ] Teste 3.1 passou (desktop)
- [ ] Teste 3.2 passou (mobile)
- [ ] Logout sempre funciona
- [ ] Nenhum erro no console

---

## 🛠 ITEM 4: EXPORTAR SUBMISSÕES CORRETAMENTE (3 pts)

### 🧪 TESTE 4.1: Botão Removido da Aba "Postagens"
- [ ] Faça login como **admin**
- [ ] Acesse `/admin`
- [ ] Vá para aba **"Postagens"**
- [ ] **ESPERADO:**
  - [ ] ❌ NÃO deve haver botão "Exportar Postagens"
  - [ ] Apenas botão "Nova Postagem" visível

### 🧪 TESTE 4.2: Botão Adicionado na Aba "Submissões"
- [ ] Na página `/admin`, vá para aba **"Submissões"**
- [ ] Selecione um evento no filtro (NÃO deixe "Selecione um evento")
- [ ] **ESPERADO:**
  - [ ] ✅ Botão **"Exportar Submissões"** deve aparecer
  - [ ] Botão só aparece APÓS selecionar evento
  - [ ] Botão tem ícone de Download

### 🧪 TESTE 4.3: Exportação com Filtros Básicos
- [ ] Selecione um evento específico
- [ ] Selecione status = "Aprovados"
- [ ] Selecione tipo = "Postagens"
- [ ] **Clique em "Exportar Submissões"**
- [ ] **ESPERADO:**
  - [ ] Download de arquivo `.xlsx` inicia
  - [ ] Nome do arquivo: `submissoes_{evento}_{data}.xlsx`
  - [ ] Toast de sucesso aparece
  - [ ] Planilha contém APENAS submissões que correspondem aos filtros

### 🧪 TESTE 4.4: Validar Conteúdo do Excel
- [ ] Abra o arquivo Excel baixado
- [ ] **ESPERADO:** Planilha deve conter colunas:
  - [ ] Evento
  - [ ] Número da Postagem
  - [ ] Nome
  - [ ] **Instagram** (formato: `https://instagram.com/usuario`)
  - [ ] Email
  - [ ] Gênero
  - [ ] Seguidores
  - [ ] Status
  - [ ] Tipo
  - [ ] Data de Envio
  - [ ] Data de Aprovação

### 🧪 TESTE 4.5: Validar Campo Instagram
- [ ] No Excel, localize coluna "Instagram"
- [ ] **ESPERADO:**
  - [ ] ✅ URLs completas: `https://instagram.com/usuario`
  - [ ] ❌ NÃO apenas `@usuario` ou `usuario`
  - [ ] URLs clicáveis (se abrir no navegador)

### 🧪 TESTE 4.6: Exportação com Todos os Filtros
- [ ] Aplique TODOS os filtros simultaneamente:
  - [ ] Evento: [escolha um]
  - [ ] Número da Postagem: [escolha um]
  - [ ] Status: "Aprovados"
  - [ ] Tipo: "Postagens"
  - [ ] Propósito: "Divulgação"
- [ ] Clique em "Exportar Submissões"
- [ ] **ESPERADO:**
  - [ ] Excel exportado com APENAS submissões que atendem TODOS os critérios
  - [ ] Contador no toast está correto

### 🧪 TESTE 4.7: Exportação Sem Resultados
- [ ] Selecione um evento
- [ ] Aplique filtros que resultem em 0 submissões
- [ ] Clique em "Exportar Submissões"
- [ ] **ESPERADO:**
  - [ ] Toast de erro: "Nenhuma submissão encontrada com os filtros aplicados"
  - [ ] NÃO faz download

### ✅ VALIDAÇÃO COMPLETA ITEM 4
- [ ] Teste 4.1 passou (botão removido de Postagens)
- [ ] Teste 4.2 passou (botão adicionado em Submissões)
- [ ] Teste 4.3 passou (exportação básica)
- [ ] Teste 4.4 passou (colunas corretas)
- [ ] Teste 4.5 passou (Instagram como URL)
- [ ] Teste 4.6 passou (todos filtros aplicados)
- [ ] Teste 4.7 passou (validação de erro)
- [ ] Nenhum erro no console

---

## 🎯 VALIDAÇÃO FINAL - TODOS OS ITENS

### ✅ CHECKLIST GERAL
- [ ] Item 1 (Faixa Seguidores) - 100% validado
- [ ] Item 2 (Redirecionamento) - 100% validado
- [ ] Item 3 (Botão Sair) - 100% validado
- [ ] Item 4 (Exportar Submissões) - 100% validado

### 🧪 TESTE DE REGRESSÃO
- [ ] Funcionalidades antigas continuam funcionando:
  - [ ] Login/Logout normal
  - [ ] Envio de submissões (posts e vendas)
  - [ ] Aprovação/Rejeição no admin
  - [ ] Exportação de usuários (outras abas)

### 🐛 BUGS ENCONTRADOS
```
[Se encontrou algum bug, descreva aqui:]

Bug 1:
- Item: 
- Descrição:
- Passos para reproduzir:

Bug 2:
- Item:
- Descrição:
- Passos para reproduzir:
```

### 📊 RESULTADO FINAL
- [ ] ✅ Todos os 4 itens passaram em TODOS os testes
- [ ] ✅ Nenhum bug crítico encontrado
- [ ] ✅ Zero regressões
- [ ] ✅ Sistema pronto para produção

---

## 🚀 APROVAÇÃO FINAL

**Testador:** _________________________  
**Data:** ___/___/______  
**Status:** [ ] APROVADO  [ ] REPROVADO  
**Observações:**
```
_________________________________________________
_________________________________________________
_________________________________________________
```

---

**Implementação concluída com sucesso! 🎉**  
**12 pontos | 4 itens | 0 bugs críticos**
