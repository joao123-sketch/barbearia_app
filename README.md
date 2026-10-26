# SuaAgenda - Plataforma de Agendamento para Barbearias e Salões

Plataforma moderna, elegante e mobile-first de agendamento online para barbearias e profissionais da beleza. Projetada para proporcionar **atrito zero** aos clientes e total controle de agenda e faturamento para os barbeiros.

---

## ✨ Principais Diferenciais

- **Mobile-First de Luxo**: Design dark sofisticado com detalhes dourados, tipografia de alta classe e animações fluidas.
- **PWA Instalável (Android & iPhone)**:
  - **Android (Chrome/Edge/Samsung)**: Instalação nativa direta com 1 clique.
  - **iOS (iPhone/Safari)**: Modal com tutorial visual passo a passo para salvar na Tela de Início.
- **Agendamento em 3 Passos**:
  1. Seleção de serviços com cálculo de preço e tempo em tempo real.
  2. Escolha de profissional e horário em calendário interativo.
  3. Preenchimento de Nome e WhatsApp com formatação automática.
- **Integração com WhatsApp**:
  - Geração automática de mensagem pronta e formatada para confirmação direta no WhatsApp da barbearia.
- **Painel Administrativo do Barbeiro (`/admin`)**:
  - Métricas do dia (clientes agendados, faturamento previsto e equipe ativa).
  - Gestão da agenda com status em tempo real (Confirmar, Concluir, Cancelar).
  - Adição rápida de agendamento manual (clientes balcão/telefone).
  - Catálogo de serviços com ativação/desativação de itens.
  - Link público personalizado com botão de cópia rápida para bio do Instagram.
- **Multi-Tenant via Supabase**:
  - Cada barbearia possui seu próprio slug (`/nk-barbearia`, etc.) e gerencia seus próprios dados com Row Level Security (RLS).
- **Hospedagem no Cloudflare Pages**:
  - Carregamento global ultrarrápido, suporte a SPA routing (`_redirects`), SSL automático e custo zero de infraestrutura.

---

## 🚀 Como Rodar Localmente

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

3. **Acesse no navegador:**
   - **Visão do Cliente**: `http://localhost:5173/` ou `http://localhost:5173/nk-barbearia`
   - **Painel do Barbeiro**: `http://localhost:5173/admin`

---

## 🗄️ Configuração do Banco (Supabase)

1. Acesse o painel do **Supabase** (`sistemaappbarbearia@gmail.com`).
2. Abra o menu **SQL Editor**.
3. Copie e cole todo o conteúdo do arquivo [`supabase_schema.sql`](./supabase_schema.sql) e clique em **Run**.
4. Em **Project Settings > API**, copie a URL e a chave `anon` pública e preencha no seu arquivo `.env`:
   ```env
   VITE_SUPABASE_URL=https://seu-projeto.supabase.co
   VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
   ```

---

## ☁️ Deploy no Cloudflare Pages

1. No painel do **Cloudflare** (`sistemaappbarbearia@gmail.com`), vá em **Workers & Pages > Create application > Pages > Connect to Git**.
2. Selecione o repositório `joao123-sketch/barbearia_app`.
3. Defina as configurações de build:
   - **Framework preset**: `Vite`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Clique em **Save and Deploy**. O sistema estará online em segundos!
