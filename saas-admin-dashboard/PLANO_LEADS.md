# Plano de Ação: Aba "Leads" (Gestão de Contatos)

Este plano descreve o desenvolvimento da aba **Leads** (`/dashboard/leads`), que servirá como o banco de dados centralizado de todos os contatos do usuário, separando a visão tabular e gerencial da visão visual do Kanban.

## 1. Objetivo da Aba "Leads"
Enquanto o **CRM Kanban** foca nas negociações ativas (arrastar e soltar), a **Aba Leads** será uma tabela robusta (Data Grid) para gerenciar o volume total de contatos. Ela é a ponte ideal entre a extração de números e o sistema de disparo em massa.

## 2. Funcionalidades Principais (UI/UX)
- **Tabela de Dados (Data Grid)**:
  - Colunas: Nome, Telefone, Status (Ativo, Frio, Quente), Tags (Etiquetas), Origem (Bot, Manual, Extrator) e Data de Criação.
  - Paginação e Ordenação por colunas.
- **Busca e Filtros Avançados**:
  - Buscar por nome ou número.
  - Filtrar contatos por Tags (ex: "Apenas clientes VIP").
- **Ações em Massa (Bulk Actions)**:
  - Selecionar vários leads através de *checkboxes* para:
    1. Exportar para CSV.
    2. Adicionar uma Tag em massa.
    3. **Enviar direto para uma Campanha de Disparo**.
    4. Adicionar ao Kanban (Pipeline).
- **Importação/Exportação**:
  - Botão de "Importar Leads" via CSV/TXT para alimentar a base sem precisar que eles enviem mensagem antes.

## 3. Arquitetura de Banco de Dados
A tabela `contacts` já existe no Supabase e gerencia as conversas, mas precisaremos expandir seu escopo (ou adicionar recursos):
- Garantir que a tabela `contacts` suporte os campos extras:
  - `email` (opcional).
  - `notes` (anotações gerais).
  - `source` (origem do lead).
- **Relacionamento com Campanhas**: Leads importados poderão ser puxados diretamente na tela de Disparos.

## 4. Rotas de API (Backend)
- **`GET /api/leads`**: Buscar lista paginada de contatos (com suporte a queries de busca e filtros de tags).
- **`POST /api/leads/import`**: Receber um CSV/JSON do frontend e realizar um `upsert` na tabela `contacts` em lote.
- **`PATCH /api/leads/bulk-update`**: Aplicar tags ou alterar status de dezenas de leads selecionados de uma vez.
- **`DELETE /api/leads`**: Excluir leads selecionados (respeitando integridade com o histórico de chat).

## 5. Fases de Implementação

- [ ] **Fase 1: UI Base e Listagem**
  - Criar o componente de Tabela (usando Tailwind e lucide-react).
  - Criar a rota de API de leitura (`GET /api/leads`).
  - Ligar a tabela aos dados reais do banco (`contacts`).
- [ ] **Fase 2: Filtros e Buscas**
  - Implementar a barra de pesquisa e filtros por Tags no frontend e na query do Supabase.
- [ ] **Fase 3: Importação e Ações em Massa**
  - Criar Modal de "Adicionar Lead" (manual) e "Importar CSV".
  - Implementar seleção com *checkboxes* e o painel flutuante de ações em massa.
- [ ] **Fase 4: Integração com Disparos**
  - Implementar a funcionalidade: "Selecionar 50 leads -> Enviar para Nova Campanha de Disparo".
