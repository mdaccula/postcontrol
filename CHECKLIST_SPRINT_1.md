# ✅ CHECKLIST DE VALIDAÇÃO - SPRINT 1

**Status:** 🟡 Aguardando Validação Manual  
**Pontuação:** 18 pontos  
**Arquivos Alterados:** 4 (Dashboard.tsx, Submit.tsx, Admin.tsx, EventDialog.tsx)  
**Migração SQL:** 1 (normalização de gênero)

---

## 🎯 VALIDAÇÃO RÁPIDA (5 minutos)

### ✅ ITEM 2: Gênero por Role (6pts)

**Teste Usuário Normal:**
```
1. Login como usuário (não admin)
2. /dashboard → aba "Minha Conta"
3. Campo "Gênero" mostra: Masculino, Feminino, LGBTQ+
4. Selecionar e salvar → Toast de sucesso
```

**Teste Agency Admin:**
```
1. Login como agency_admin
2. /dashboard → aba "Minha Conta"
3. Campo "Gênero" BLOQUEADO com valor "Agência"
4. Mensagem: "Administradores de agência têm gênero fixo como 'Agência'"
```

**Verificar DB:**
```sql
SELECT id, email, gender FROM profiles WHERE gender IS NOT NULL LIMIT 10
-- ✅ Deve ter: Masculino, Feminino, LGBTQ+, Agência
-- ❌ NÃO deve ter: male, female, other
```

---

### ✅ ITEM 5: Campos Fixos Instagram/Seguidores (2pts)

**Teste Novo Usuário:**
```
1. Login com usuário novo
2. /submit → selecionar evento
3. Instagram: EDITÁVEL ✅
4. Preencher @teste_123
5. Enviar submissão
```

**Teste Usuário Existente:**
```
1. Mesmo usuário, ir para /submit novamente
2. Instagram: BLOQUEADO 🔒
3. Mensagem: "Instagram bloqueado após o primeiro envio..."
```

---

### ✅ ITEM 6: Faixa de Seguidores (2pts)

**Teste:**
```
1. /dashboard → aba "Minha Conta"
2. Novo campo: "Faixa de Seguidores"
3. Opções: 0-5k, 5k-10k, 10k-50k, 50k-100k, 100k+
4. Selecionar → Salvamento AUTOMÁTICO (sem botão)
5. Reload → valor mantido ✅
```

---

### ✅ ITEM 11: Exportar Postagens (5pts)

**Teste:**
```
1. Login como agency_admin
2. /admin → aba "Postagens"
3. Botão "Exportar Postagens" (ícone Download)
4. Clicar → Excel baixado automaticamente
```

**Validar Excel:**
```
Colunas obrigatórias:
✅ Evento
✅ Nome
✅ Instagram (com https://instagram.com/)
✅ Email
✅ Gênero
✅ Seguidores
✅ Total de Postagens (número, não #1, #2)
✅ Data de Aprovação (DD/MM/YYYY)
```

---

### ✅ ITEM 17: Bug Sobrescrita de Imagem (3pts)

**Teste:**
```
1. /admin → Criar dois eventos: "Evento A" e "Evento B"
2. Editar Evento A → Upload imagem_A.jpg → Salvar
3. IMEDIATAMENTE editar Evento B → Upload imagem_B.jpg → Salvar
4. Voltar para Evento A → Imagem deve ser imagem_A.jpg ✅
```

**Verificar Storage:**
```
Backend → Storage → screenshots → events/
✅ Deve ter 2 arquivos diferentes:
   - events/[uuid-A]_[timestamp].jpg
   - events/[uuid-B]_[timestamp].jpg
```

**Teste Atualização:**
```
1. Editar Evento A → Upload nova imagem
2. Storage: imagem antiga DELETADA ✅, só nova existe
```

---

## 🎯 APROVAÇÃO PARA PRÓXIMA SPRINT

**Sprint 1 só deve ser aprovada se:**
- [ ] Todos os 5 itens passaram nos testes
- [ ] Nenhum bug foi introduzido
- [ ] Dados do banco foram normalizados

**Após aprovação, iniciar:**
- Sprint 2: Melhorias UX (13 pontos)
- Items: 9, 12, 13, 14, 16

---

## 🔴 PROBLEMAS ENCONTRADOS?

Se algum item falhar:
1. Anotar qual item falhou
2. Descrever o comportamento esperado vs. real
3. Tirar screenshot se possível
4. Reportar antes de continuar para Sprint 2
