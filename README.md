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
DATABASE_URL=postgres://postgres:postgres@localhost:5432/school_control
RABBITMQ_URL=amqp://guest:guest@localhost:5672
PORT=3001
```

| Variável | Descrição |
|---|---|
| `DATABASE_URL` | Connection string do PostgreSQL |
| `RABBITMQ_URL` | Connection string do RabbitMQ |
| `PORT` | Porta em que a API vai subir |

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

A API ficará disponível em `http://localhost:3001` (ou na porta configurada em `PORT`).

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

Painel do RabbitMQ: `http://localhost:15672` (user/pass definidos no `docker-compose.yml`).

---

## Eventos de students (RabbitMQ)

Os endpoints de students publicam eventos em exchanges dedicadas:

- `student.created` na `academic.students.created.exchange`
- `student.updated` na `academic.students.updated.exchange`
- `student.deleted` na `academic.students.deleted.exchange`

Guia completo de publicacao e testes:

- [docs/students-events.md](docs/students-events.md)
- [docs/rabbitmq.md](docs/rabbitmq.md)
- [docs/queue-mapping.md](docs/queue-mapping.md)

---

## Documentação

- [docs/api-standards.md](docs/api-standards.md)
- [docs/hateoas.md](docs/hateoas.md)
- [docs/validation.md](docs/validation.md)
- [docs/swagger.md](docs/swagger.md)
- [docs/rabbitmq.md](docs/rabbitmq.md)
- [docs/students-events.md](docs/students-events.md)
