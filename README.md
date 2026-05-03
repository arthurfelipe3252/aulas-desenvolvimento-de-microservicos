# School Control API

API REST para gestão escolar, construída com NestJS + Drizzle ORM + PostgreSQL.

## Pré-requisitos

- [Node.js](https://nodejs.org) >= 20
- [npm](https://www.npmjs.com) >= 10
- [PostgreSQL](https://www.postgresql.org) >= 14 rodando localmente (ou via Docker)
- [RabbitMQ](https://www.rabbitmq.com) (para eventos de students)

---

## Configuração

### 1. Instalar dependências

```bash
npm install
```

### 2. Configurar variáveis de ambiente

Crie um arquivo `.env` na raiz do projeto com base no exemplo abaixo:

```env
# Servidor
PORT=3000

# Banco de dados
DB_USER=<seu-usuario>
DB_PASSWORD=<sua-senha>
DB_NAME=school_control
DB_PORT=5433
DATABASE_URL=postgresql://<seu-usuario>:<sua-senha>@localhost:5433/school_control

# RabbitMQ
RABBITMQ_PORT=5673
RABBITMQ_MANAGEMENT_PORT=15673
RABBITMQ_URL=amqp://<seu-usuario>:<sua-senha>@localhost:5673
```

| Variável | Descrição |
|---|---|
| `PORT` | Porta em que a API vai subir |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` / `DB_PORT` | Credenciais consumidas pelo `docker-compose.yml` para subir o Postgres |
| `DATABASE_URL` | Connection string do PostgreSQL usada pelo Drizzle |
| `RABBITMQ_PORT` / `RABBITMQ_MANAGEMENT_PORT` | Portas do host onde o RabbitMQ é publicado pelo Compose (default `5672`/`15672`) |
| `RABBITMQ_URL` | Connection string AMQP usada pela aplicação |

> Por que `5673`/`15673` em vez das portas padrão? Para evitar conflito com outras instâncias de RabbitMQ que possam já estar rodando localmente em outros projetos. Se você não tem essa colisão, pode usar `5672`/`15672` — basta alinhar `RABBITMQ_PORT`, `RABBITMQ_MANAGEMENT_PORT` e a porta dentro de `RABBITMQ_URL`.

### 3. Criar e migrar o banco de dados

Com o PostgreSQL rodando, execute as migrações para criar as tabelas:

```bash
npm run db:migrate
```

---

## Rodando a aplicação

### Desenvolvimento (com hot reload)

```bash
npm run start:dev
```

### Produção

```bash
npm run build
npm run start:prod
```

A API ficará disponível em `http://localhost:3000` (ou na porta configurada em `PORT`). Swagger UI em `/docs`.

---

## Scripts disponíveis

| Script | Descrição |
|---|---|
| `npm run start:dev` | Inicia em modo desenvolvimento com hot reload |
| `npm run start` | Inicia sem hot reload |
| `npm run start:prod` | Inicia o build de produção |
| `npm run build` | Gera o build de produção em `dist/` |
| `npm run db:generate` | Gera arquivos de migration a partir dos schemas |
| `npm run db:migrate` | Aplica as migrations no banco |
| `npm run db:push` | Sincroniza o schema diretamente no banco (sem migration) |
| `npm run db:studio` | Abre o Drizzle Studio para inspecionar o banco visualmente |
| `npm run lint` | Executa o linter (Biome) |
| `npm run check` | Executa lint + formatação (Biome) |

---

## Subindo o PostgreSQL com Docker

Caso não tenha o PostgreSQL instalado localmente, suba uma instância com Docker:

```bash
docker run --name school-db \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=school_control \
  -p 5432:5432 \
  -d postgres:16
```

---

## Subindo infraestrutura com Docker Compose

Para subir Postgres + RabbitMQ de uma vez:

```bash
docker compose up -d rabbitmq postgres
```

| Serviço | URL local | Login |
|---|---|---|
| Painel RabbitMQ | `http://localhost:${RABBITMQ_MANAGEMENT_PORT}` | `RABBITMQ_USER` / `RABBITMQ_PASSWORD` do `.env` |
| Broker AMQP | `amqp://localhost:${RABBITMQ_PORT}` | mesmas do painel |
| Postgres | `localhost:${DB_PORT}` | `DB_USER` / `DB_PASSWORD` do `.env` |

---

## Eventos de students (RabbitMQ)

Os endpoints `POST`, `PUT` e `DELETE` de `/v1/students` publicam eventos em exchanges dedicadas:

| Operação | Exchange | Routing key | Payload |
|---|---|---|---|
| Criação | `academic.students.created.exchange` | `student.created` | snapshot do student criado |
| Atualização | `academic.students.updated.exchange` | `student.updated` | snapshot do student atualizado |
| Remoção | `academic.students.deleted.exchange` | `student.deleted` | snapshot do student antes do delete |

As 3 exchanges (`direct`, `durable`) são criadas automaticamente no startup pelo `StudentExchangesInitializer`.

### Arquitetura — producer-only

Este microsserviço é **apenas produtor**. A divisão de responsabilidades segue `docs/queue-mapping.md`:

- ✅ Students cria e mantém **suas exchanges**.
- ❌ Students **não** cria filas nem bindings — isso é responsabilidade de cada microsserviço **consumer** (enrollment, attendance, etc.).

Como nenhum consumer existe ainda, mensagens publicadas em exchanges sem binding são descartadas pelo broker como `unroutable` — comportamento esperado.

### Observando mensagens durante o desenvolvimento

Para ver as mensagens publicadas, crie filas de inspeção temporárias e faça binding nas exchanges:

1. Acesse o painel do RabbitMQ (URL e login conforme tabela acima).
2. Aba **Queues and Streams** → criar `inspect.created`, `inspect.updated`, `inspect.deleted` (durable).
3. Aba **Exchanges** → para cada `academic.students.{created,updated,deleted}.exchange`, adicionar binding para a fila correspondente com routing key `student.{created,updated,deleted}`.
4. Disparar requisições via Swagger (`/docs`).
5. Voltar nas filas → **Get messages** para ler os payloads.

Documentação detalhada:

- [docs/students-events.md](docs/students-events.md) — guia de implementação e testes
- [docs/rabbitmq.md](docs/rabbitmq.md) — conceitos e estrutura do módulo
- [docs/queue-mapping.md](docs/queue-mapping.md) — topologia completa de exchanges/filas dos microsserviços

---

## Documentação

- [docs/api-standards.md](docs/api-standards.md)
- [docs/hateoas.md](docs/hateoas.md)
- [docs/validation.md](docs/validation.md)
- [docs/swagger.md](docs/swagger.md)
- [docs/rabbitmq.md](docs/rabbitmq.md)
- [docs/students-events.md](docs/students-events.md)
