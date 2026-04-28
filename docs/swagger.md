# Swagger

O Swagger gera a documentação interativa da API automaticamente a partir dos decorators existentes nos controllers e DTOs. A UI fica disponível em `/docs` após subir a aplicação.

## Como funciona neste projeto

```
DTOs          → @ApiProperty     → descreve os campos de cada schema
Controllers   → @ApiTags         → agrupa endpoints por recurso
              → @ApiOperation    → descreve cada endpoint
              → @ApiResponse     → documenta os status codes
              → @ApiBearerAuth   → indica que a rota requer JWT
main.ts       → SwaggerModule    → monta e serve a documentação
```

---

## Instalação

```bash
npm install @nestjs/swagger
```

---

## Configuração global — `main.ts`

```typescript
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("v1");

  // ...ValidationPipe...

  const config = new DocumentBuilder()
    .setTitle("School Control API")
    .setDescription("Descrição da API.")
    .setVersion("1.0")
    .addBearerAuth({ type: "http", scheme: "bearer", bearerFormat: "JWT" })
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);   // UI em /docs

  await app.listen(process.env.PORT ?? 3000);
}
```

| Método | Descrição |
| --- | --- |
| `setTitle` | Título exibido no topo da UI |
| `setDescription` | Descrição geral da API |
| `setVersion` | Versão exibida na UI |
| `addBearerAuth` | Adiciona o campo de JWT na UI para autenticar as requisições |
| `SwaggerModule.setup` | Define a rota onde a UI será servida |

---

## DTOs — `@ApiProperty`

Cada campo dos DTOs precisa de `@ApiProperty` para aparecer no schema do Swagger.

### DTOs de input

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class CreateStudentDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  document: string;
}
```

Campos opcionais recebem `required: false`:

```typescript
export class UpdateStudentDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;
}
```

### DTOs de response

DTOs de response com construtor privado precisam ter as propriedades declaradas como campos públicos da classe para que o Swagger consiga ler os metadados. O `static from` permanece o mesmo:

```typescript
import { ApiProperty } from "@nestjs/swagger";

export class StudentDto {
  @ApiProperty()
  id: string | undefined;

  @ApiProperty()
  name: string;

  // construtor privado e static from permanecem iguais
  private constructor(...) { ... }

  static fromStudent(student: Student | null): StudentDto | null { ... }
}
```

### Campos especiais

```typescript
// Enum
@ApiProperty({ enum: AttendanceStatus })
status: AttendanceStatus;

// Array de enum
@ApiProperty({ enum: Permission, isArray: true })
permissions: Permission[];

// Campo nullable
@ApiProperty({ nullable: true })
canceledAt: Date | null | undefined;

// Array de tipo primitivo
@ApiProperty({ isArray: true, type: String })
permissions: string[];
```

---

## Controllers

### Agrupamento e autenticação

```typescript
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

@ApiTags("students")      // agrupa na UI sob "students"
@ApiBearerAuth()          // todas as rotas do controller requerem JWT
@Controller("students")
export class StudentsController { ... }
```

> Rotas públicas (sem autenticação) não recebem `@ApiBearerAuth()`.

### Documentar cada endpoint

```typescript
import { ApiOperation, ApiQuery, ApiNotFoundResponse, ApiNoContentResponse } from "@nestjs/swagger";

// GET com paginação
@Get()
@ApiOperation({ summary: "Listar estudantes" })
@ApiQuery({ name: "_page", required: false, type: Number })
@ApiQuery({ name: "_size", required: false, type: Number })
async findAll(...) { ... }

// GET com filtro obrigatório
@Get()
@ApiOperation({ summary: "Listar presenças por turma" })
@ApiQuery({ name: "class_offering_id", required: true, type: String })
async findAll(...) { ... }

// GET por ID
@Get(":id")
@ApiOperation({ summary: "Buscar estudante por ID" })
@ApiNotFoundResponse({ description: "Estudante não encontrado" })
async findById(...) { ... }

// POST
@Post()
@ApiOperation({ summary: "Criar estudante" })
async create(...) { ... }

// PUT — sem body de resposta
@Put(":id")
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: "Atualizar estudante" })
@ApiNoContentResponse({ description: "Estudante atualizado" })
@ApiNotFoundResponse({ description: "Estudante não encontrado" })
async update(...) { ... }

// DELETE
@Delete(":id")
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: "Remover estudante" })
@ApiNoContentResponse({ description: "Estudante removido" })
@ApiNotFoundResponse({ description: "Estudante não encontrado" })
async remove(...) { ... }

// PATCH — ação descritiva
@Patch(":id/activate")
@HttpCode(HttpStatus.NO_CONTENT)
@ApiOperation({ summary: "Ativar turma" })
@ApiNoContentResponse({ description: "Turma ativada" })
async activate(...) { ... }
```

### Decorators de resposta disponíveis

| Decorator | Status |
| --- | --- |
| `@ApiOkResponse` | `200 OK` |
| `@ApiCreatedResponse` | `201 Created` |
| `@ApiNoContentResponse` | `204 No Content` |
| `@ApiBadRequestResponse` | `400 Bad Request` |
| `@ApiUnauthorizedResponse` | `401 Unauthorized` |
| `@ApiNotFoundResponse` | `404 Not Found` |

---

## Regras

- `@ApiProperty()` em **todos** os campos dos DTOs de input e response — campos sem o decorator não aparecem no schema
- Campos opcionais usam `@ApiProperty({ required: false })` — espelha o `@IsOptional()` do class-validator
- DTOs de response com construtor privado precisam declarar as propriedades como campos públicos da classe
- `@ApiBearerAuth()` no controller cobre todas as rotas; rotas públicas (`@Public()`) ficam em controllers separados ou sem o decorator
- `@ApiQuery` é necessário para que query params apareçam como campos preenchíveis na UI — parâmetros não declarados ficam invisíveis
- `@ApiTags` define o nome do grupo na UI; usar o mesmo nome do `@Controller` para manter consistência
