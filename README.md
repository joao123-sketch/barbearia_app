# SuaAgenda — Agendamento online para barbearias e salões

> **Seus clientes agendam sozinhos pelo link. Você só atende.**
> Sem aplicativo para o cliente baixar, sem taxa por agendamento, sem complicação.

---

## 📣 Resumo para o panfleto / anúncio

**O que é:** um sistema de agenda online para barbearias e salões de beleza. O dono recebe um link próprio (ex.: `suaagenda.../b/nome-da-barbearia`), coloca na bio do Instagram ou manda no WhatsApp, e os clientes escolhem serviço, profissional, dia e horário sozinhos, 24 horas por dia.

**Para quem:** barbeiros, donos de barbearia, salões, cabeleireiras, manicures e profissionais da beleza que hoje marcam horário pelo WhatsApp ou no caderno.

**Dor que resolve:**
- Parar de responder "tem horário hoje?" o dia inteiro.
- Acabar com horário marcado em cima do outro.
- Acabar com cliente que esquece e falta (lembrete no celular).
- Saber quanto fatura por dia, semana e mês sem fazer conta.

**Promessa:** o cliente agenda em menos de 1 minuto, e o dono vê tudo no celular.

### Benefícios (use estes no anúncio)
| Para o dono | Para o cliente |
|---|---|
| Agenda organizada, sem conflito de horário | Agenda a qualquer hora, sem esperar resposta |
| Aviso no celular a cada novo agendamento | Escolhe serviço, profissional e horário livre |
| Faturamento do dia, da semana e histórico de cortes | Recebe lembrete do horário no celular |
| Link próprio com a cara do seu negócio (logo, cores, Instagram, endereço) | Não precisa baixar nada nem criar conta |
| Funciona como app no celular (instala na tela inicial) | Chama o estabelecimento no WhatsApp com um toque |

### Oferta
- **20 dias grátis** para testar, sem precisar de cartão.
- Depois, **R$ 70,00 por mês**, pago antecipado por **PIX**. Cada pagamento libera 30 dias.
- Sem fidelidade e sem taxa por agendamento.
- Cada WhatsApp tem direito a um teste grátis.

### Como começar (3 passos)
1. Crie a conta com seu WhatsApp, nome do negócio e logo.
2. Cadastre seus serviços, preços, equipe e horários de funcionamento.
3. Copie o seu link e divulgue no Instagram e no WhatsApp. Pronto.

### Contato / chamada para ação
- **WhatsApp: (88) 98894-1408** — dúvidas, teste grátis e suporte.
- Quer ver funcionando? Acesse a **conta de demonstração**: `https://SEU-DOMINIO/b/SLUG-DA-CONTA-DEMO` *(preencher com o link da conta de teste)*.
- Sugestão de QR Code no panfleto: aponta para o link da conta de demonstração ou para `https://SEU-DOMINIO/cadastrar`.

### Tom e visual sugeridos
- Linguagem simples, direta e brasileira. Frases curtas, foco no benefício ("agenda cheia, cabeça tranquila").
- Visual escuro com detalhes dourados (identidade do app); fundo preto/grafite, destaque em dourado, fotos de corte e barba, tela do celular mostrando a agenda.
- Mostrar o celular com o painel do dono (agenda do dia, faturamento) e a tela de agendamento do cliente.

### ⚠️ Não prometer (ainda não é verdade)
- Não dizer que o sistema envia lembretes por SMS ou WhatsApp automático: o lembrete é **notificação no celular** do cliente (precisa permitir notificações ao abrir o link).
- Não dizer "pagamento online do serviço" ou "cobrança do cliente": o app não cobra o cliente final.
- Não citar números de clientes ou depoimentos que não existam.

---

## ✨ Funcionalidades

### Para o cliente final (link público)
- **Agendamento em 3 passos:** serviços (com preço e tempo somados na hora) → profissional e horário → nome e WhatsApp.
- Só mostra horários realmente livres (respeita expediente, almoço, folgas e agendamentos já feitos).
- **Lembrete no celular** do horário (10 min, 30 min ou 1 hora antes), por notificação.
- Página do negócio com logo, banner, endereço, Instagram e botão de WhatsApp.
- **Instalável como app** no Android (1 toque) e no iPhone (tutorial passo a passo na tela).

### Para o dono (painel `/admin`)
- **Agenda de hoje** com status em tempo real: *Agendado* até o horário passar e *Concluído* automaticamente ao fim do atendimento. Cancelar e reativar quando precisar.
- **Visão da semana** com agendamentos, horários livres e faturamento por dia.
- **Histórico de cortes** só com atendimentos concluídos/cancelados, com filtro por mês, status e busca por cliente.
- **Faturamento** e ticket médio do dia, e total do histórico.
- **Agendamento de balcão** (cliente presencial ou por telefone).
- **Serviços:** nome, preço, duração, categoria e combos; ativar, editar e excluir.
- **Equipe:** vários profissionais, cada um com a própria agenda.
- **Horários:** expediente por dia da semana, almoço, e bloqueio de datas (férias/viagens).
- **Notificação no celular** a cada novo agendamento.
- **Personalização:** 8 estilos visuais (elegante, sofisticado, moderno, minimalista, simples, rosa, azul, neutro), logo, ícone do app, slogan, endereço e Instagram.
- **Atendimento:** botão de suporte direto no WhatsApp, em Configurações.
- Tema claro e escuro.

### Para a plataforma (painel master `/master`, só administrador)
- Lista de contas com status (teste, pago, vencido, bloqueado), vencimento e mensalidade individual.
- Confirmação de pagamento por PIX (libera +30 dias), bloqueio e exclusão de contas.
- Reajuste de mensalidade individual ou em porcentagem para todas.
- **Métricas de uso por conta**, só totais e sem dados dos clientes finais: data de cadastro, serviços, atendimentos, média de horas atendidas por dia, faturamento do mês, do mês passado e total.
- Link de cadastro para novos clientes e configuração do PIX/QR Code.

---

## 🔒 Privacidade e segurança
- Cada negócio só enxerga os próprios dados (Row Level Security no banco).
- O cliente final agenda por função segura no servidor, que valida horário, preço e conflito.
- Nome e telefone dos clientes finais **nunca** aparecem para outros negócios nem para o painel master. O master vê apenas totais.
- Cobrança (status, vencimento, valor) só é alterada pelo administrador, nunca direto pelo navegador.

---

## 🛠️ Para desenvolvedores

**Stack:** React + TypeScript + Vite + Tailwind, Supabase (Auth, Postgres, Realtime, Edge Functions), Cloudflare Workers/Pages, PWA com Web Push.

### Rodar localmente
```bash
npm install
npm run dev
```
- Cliente: `http://localhost:5173/b/<slug>`
- Painel do dono: `http://localhost:5173/admin`
- Painel master: `http://localhost:5173/master`

Preencha o `.env` (veja `.env.example`):
```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### Banco (Supabase)
1. Abra o **SQL Editor** e rode, em ordem, os arquivos de `supabase/migrations/` (`0001` até `0009`).
2. Crie a sua conta no app e torne-se administrador:
   ```sql
   insert into public.platform_admins (user_id)
   select id from auth.users where email = 'seu@email.com';
   ```
3. `0009_admin_metrics.sql` habilita as métricas por conta no painel master.

### Conta de demonstração (para panfleto e vendas)
1. Crie uma conta normalmente no app.
2. Abra `supabase/seed_demo_account.sql`, troque o e-mail em `v_email` e rode no SQL Editor.
3. Ele cria atendimentos fictícios do mês passado até o fim da semana atual. Pode rodar de novo: recria só o que ele mesmo criou (`notes = 'demo'`).

### Deploy
Cloudflare Workers/Pages com `npm run build` e saída em `dist` (configuração em `wrangler.jsonc`).
