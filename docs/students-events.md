# Eventos de Students — Publicação (Fase 2)

Guia de implementação para integrar a publicação de eventos do microsserviço `students` aos endpoints. A Fase 1 (já concluída) deixou as 3 exchanges criadas no broker no startup. Esta fase faz o `StudentService` **publicar** mensagens nessas exchanges sempre que um estudante for criado, atualizado ou removido.

## Pré-requisitos (já implementados)

- `RabbitMQService` conectado ao broker no `OnModuleInit`.
- `MessagingService.publish(dto, exchangeName, routingKey)` disponível.
- `StudentExchangesInitializer` criando as 3 exchanges no `OnApplicationBootstrap`.
- `MessagingModule` exporta `MessagingService`.
- `StudentsModule` importa `MessagingModule`.
- Constantes em `student-events.constants.ts` com `STUDENT_EVENTS.{CREATED,UPDATED,DELETED}`.

## Visão geral

```
POST   /v1/students        ─► StudentService.create()  ─► repository.create()
                                                       └► publish(student.created)
PUT    /v1/students/:id    ─► StudentService.edit()    ─► repository.update()
                                                       └► publish(student.updated)
DELETE /v1/students/:id    ─► StudentService.remove()  ─► repository.delete()
                                                       └► publish(student.deleted)
```

| Operação | Exchange | Routing key | Payload |
|---|---|---|---|
| `create` | `academic.students.created.exchange` | `student.created` | snapshot do student criado |
| `edit` | `academic.students.updated.exchange` | `student.updated` | snapshot do student atualizado |
| `remove` | `academic.students.deleted.exchange` | `student.deleted` | snapshot do student **antes** do delete |

## Regras invariantes

1. **Persistir antes de publicar.** Nenhum publish pode preceder a operação no banco. Se o publish falhar, fica inconsistência (assunto da Outbox, fora do escopo); se persistir falhar, nada vai para o broker.
2. **Publish mora no service, não no controller.** Se amanhã houver outra porta de entrada (importação CSV, comando admin), ela também precisa publicar — manter no service garante isso.
3. **Payload é JSON serializado** com todos os campos do student (`id`, `name`, `email`, `document`, `registration`). Consumers podem usar qualquer campo como chave de correlação, já que IDs internos não batem entre microsserviços diferentes.
4. **`remove` exige busca prévia.** Não dá para publicar snapshot de algo que já foi deletado. Mudança de comportamento: DELETE em ID inexistente passa de no-op silencioso para `404 Not Found` — alinhado com `edit`, que já retorna 404.

## Mudanças por arquivo

### 1. `src/modules/students/application/services/student.service.ts`

**Imports adicionais:**

```typescript
import { MessagingService } from "@modules/messaging/application/services/messaging.service";
import { STUDENT_EVENTS } from "@modules/students/infra/messaging/student-events.constants";
```

**Construtor — injetar `MessagingService`:**

```typescript
constructor(
  @Inject(STUDENT_REPOSITORY)
  private readonly studentRepository: StudentRepository,
  private readonly messagingService: MessagingService,
) {}
```

**Helper privado para encapsular a serialização e a chamada de publish:**

```typescript
private async publishEvent(
  event: { exchange: string; routingKey: string },
  student: Student,
): Promise<void> {
  const payload = JSON.stringify({
    id: student.id,
    name: student.name,
    email: student.email,
    document: student.document,
    registration: student.registration,
  });

  await this.messagingService.publish(
    { content: payload },
    event.exchange,
    event.routingKey,
  );
}
```

**`create()` — buscar após persistir para obter o `id` gerado pelo banco:**

```typescript
async create(dto: CreateStudentDto): Promise<void> {
  const existing = await this.studentRepository.findByEmail(dto.email);
  if (existing) {
    throw new ConflictException("Email already registered");
  }

  const student = Student.restore(dto);
  await this.studentRepository.create(student!);

  // Recarrega para pegar o id gerado pelo defaultRandom() do banco
  const created = await this.studentRepository.findByEmail(dto.email);
  await this.publishEvent(STUDENT_EVENTS.CREATED, created!);
}
```

> O `Student.restore(dto)` em memória não recebe o `id` — ele só nasce no `INSERT` do Postgres (`defaultRandom()` no schema). A busca extra após o create resolve isso. Alternativa mais limpa (gerar UUID na app antes do INSERT) está fora do escopo desta fase para não alterar `Student.entity` nem o repository.

**`edit()` — publicar com a entidade já em memória:**

```typescript
async edit(id: string, dto: UpdateStudentDto): Promise<void> {
  const student = await this.studentRepository.findById(id);
  if (!student) {
    throw new NotFoundException("Student not found");
  }

  if (dto.email && dto.email !== student.email) {
    const existing = await this.studentRepository.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException("Email already registered");
    }
  }

  if (dto.name) student.withName(dto.name);
  if (dto.email) student.withEmail(dto.email);
  if (dto.document) student.withDocument(dto.document);
  if (dto.registration) student.withRegistration(dto.registration);

  await this.studentRepository.update(student);
  await this.publishEvent(STUDENT_EVENTS.UPDATED, student);
}
```

**`remove()` — buscar antes para ter o snapshot, deletar, publicar:**

```typescript
async remove(id: string): Promise<void> {
  const student = await this.studentRepository.findById(id);
  if (!student) {
    throw new NotFoundException("Student not found");
  }

  await this.studentRepository.delete(id);
  await this.publishEvent(STUDENT_EVENTS.DELETED, student);
}
```

### 2. Nada mais precisa mudar

- `StudentsController` permanece intacto.
- `StudentsModule` já importa `MessagingModule` (Fase 1).
- DTOs (`Create`, `Update`, `Student`) permanecem intactos.
- Schema Drizzle, repository, entidade — sem mudanças.
- `MessagingModule`, `RabbitMQService`, `MessagingService` — sem mudanças.

## Como testar

### 1. Pré-condições

```bash
docker compose up -d rabbitmq postgres
npm run start:dev
```

Logs esperados (já validados na Fase 1):
- `RabbitMQ connection established`
- `Exchange asserted: academic.students.created.exchange` (×3)
- `Nest application successfully started`

### 2. Confirmar contagem de mensagens vazia no broker

Como nenhum consumer existe, mensagens publicadas em exchanges **sem fila vinculada** são descartadas pelo broker (`direct` exchange + sem binding = unroutable). Para conseguir **observar** as mensagens publicadas, crie uma fila temporária de inspeção pelo painel:

1. Abrir `http://localhost:15673` (login `school` / `school123`).
2. Aba **Queues and Streams** → **Add a new queue**.
3. Criar `inspect.students.created.queue` (durable: yes).
4. Aba **Exchanges** → clicar em `academic.students.created.exchange`.
5. Em **Bindings** → adicionar binding para `inspect.students.created.queue` com routing key `student.created`.
6. Repetir para `updated` e `deleted`.

> Esse passo é apenas de **observação manual** durante o desenvolvimento. Em produção, cada microsserviço consumer cria suas próprias filas, conforme `docs/queue-mapping.md`.

### 3. Disparar eventos via Swagger

Abrir `http://localhost:3000/docs` e executar nesta ordem:

| Endpoint | Body | Esperado |
|---|---|---|
| `POST /v1/students` | `{ "name": "Alice", "email": "alice@test.com", "document": "111", "registration": "R001" }` | `201 Created` |
| `PUT  /v1/students/:id` | `{ "name": "Alice Updated" }` | `204 No Content` |
| `DELETE /v1/students/:id` | — | `204 No Content` |

Após cada chamada, no painel do RabbitMQ:
- Aba **Queues** → clicar na fila correspondente (`inspect.students.created.queue`, etc).
- Botão **Get messages** → ver o payload JSON publicado.

### 4. Verificar contagem de mensagens

Cada operação deve aparecer como uma mensagem na fila correspondente. Contagem na coluna **Ready**:
- `inspect.students.created.queue` → 1 (após o POST)
- `inspect.students.updated.queue` → 1 (após o PUT)
- `inspect.students.deleted.queue` → 1 (após o DELETE)

### 5. Casos de erro (não devem publicar)

| Cenário | Esperado |
|---|---|
| `POST` com email já existente | `409 Conflict`, **nenhuma** mensagem publicada |
| `PUT` em id inexistente | `404 Not Found`, **nenhuma** mensagem publicada |
| `DELETE` em id inexistente | `404 Not Found`, **nenhuma** mensagem publicada (mudança de comportamento — antes era no-op silencioso) |

A regra "persistir antes de publicar" garante que falhas de validação ou de banco abortam antes da publicação.

## O que não faz parte desta fase

- Padrão **Outbox** (garantia transacional entre persistir e publicar).
- Versionamento de eventos no payload (`{ version, occurredAt, eventId, data }`).
- Retry automático em caso de falha do broker.
- Implementação de consumers — cada microsserviço consumidor é responsável por suas filas e bindings.
- Remoção do `MessagingController` demo.
- Remoção do `MessageConsumerService` (ainda comentado).

## Checklist final

- [ ] `MessagingService` injetado no `StudentService`.
- [ ] Helper `publishEvent` criado.
- [ ] `create()` publica após persistir + busca extra para pegar o `id`.
- [ ] `edit()` publica após `repository.update()`.
- [ ] `remove()` busca antes, deleta, publica (com `NotFoundException` se não existir).
- [ ] `npx tsc --noEmit` sem erros.
- [ ] Smoke test pelo Swagger + painel do RabbitMQ confirma mensagens nas 3 filas de inspeção.
