# API Standards

Padronização das rotas da API garante consistência, previsibilidade e facilidade de manutenção para todos os consumidores.

## Estrutura da URL

```
https://dominio/v{versão}/{coleção}/{id}/{subColeção}/{id}
```

- Máximo de dois níveis de coleção (`/coleção/{id}/subColeção`)
- Sempre usar coleções no **plural**
- Nomes compostos em **lowerCamelCase** (`classOfferings`, não `class-offerings`)
- Sem verbos nos nomes dos recursos (`/users/{id}/password` é melhor que `/resetPasswordUser`)

---

## Versionamento — `main.ts`

O prefixo global define a versão da API para todas as rotas de uma vez.

```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix("v1");   // todas as rotas ficam em /v1/...

  // ...
}
```

Resultado: `GET /v1/users`, `POST /v1/students`, etc.

### Por que versionar

- Evita quebra de compatibilidade para integrações existentes ao evoluir a API
- Permite manter versões antigas ativas durante uma migração
- Define um ciclo de vida explícito para cada versão

---

## Métodos HTTP e status codes

| Operação | Método | Rota | Status de sucesso |
| --- | --- | --- | --- |
| Listar | `GET` | `/v1/users` | `200 OK` |
| Buscar por ID | `GET` | `/v1/users/{id}` | `200 OK` |
| Criar | `POST` | `/v1/users` | `201 Created` |
| Atualizar | `PUT` | `/v1/users/{id}` | `204 No Content` |
| Remover | `DELETE` | `/v1/users/{id}` | `204 No Content` |
| Ação descritiva | `PATCH` | `/v1/users/{id}/activate` | `204 No Content` |

### Regras

- `GET` — nunca recebe body
- `POST` — nunca recebe query params
- `PUT` / `DELETE` — nunca recebem query params

### Operações não-CRUD

Para ações que não se encaixam diretamente no CRUD, usar sub-recursos descritivos com `PATCH`:

```
PATCH /v1/classOfferings/{id}/activate
PATCH /v1/classOfferings/{id}/deactivate
PATCH /v1/enrollments/{id}/cancel
```

> Nunca usar verbos genéricos como `/status` com body. Prefira rotas que descrevem a ação diretamente.

### Implementação no controller

```typescript
import { HttpCode, HttpStatus, Patch, Delete } from "@nestjs/common";

// PUT e DELETE retornam 204
@Put(":id")
@HttpCode(HttpStatus.NO_CONTENT)
async update(@Param("id") id: string, @Body() body: UpdateUserDto) {
  return this.userService.edit(id, body);
}

@Delete(":id")
@HttpCode(HttpStatus.NO_CONTENT)
async remove(@Param("id") id: string) {
  return this.userService.remove(id);
}

// Ação descritiva com PATCH
@Patch(":id/activate")
@HttpCode(HttpStatus.NO_CONTENT)
async activate(@Param("id") id: string) {
  return this.service.activate(id);
}
```

> O NestJS já retorna `201` automaticamente para `POST`. Os demais retornam `200` por padrão — use `@HttpCode` para sobrescrever quando necessário.

---

## Paginação

Os parâmetros de paginação seguem o padrão com prefixo `_` para diferenciá-los de filtros de negócio.

```
GET /v1/users?_page=2&_size=50
```

| Parâmetro | Descrição | Padrão |
| --- | --- | --- |
| `_page` | Página desejada (base 1) | `1` |
| `_size` | Itens por página | `10` |

### Implementação no controller

```typescript
import { DefaultValuePipe, ParseIntPipe, Query } from "@nestjs/common";

@Get()
async findAll(
  @Query("_page", new DefaultValuePipe(1), ParseIntPipe) page: number,
  @Query("_size", new DefaultValuePipe(10), ParseIntPipe) limit: number,
) {
  return this.service.listPaginated({ page, limit });
}
```

### Estrutura da resposta paginada

```json
{
  "data": [...],
  "meta": {
    "totalItems": 100,
    "itemsPerPage": 10,
    "currentPage": 2,
    "totalPages": 10
  },
  "_links": {
    "self": { "href": "/v1/users?_page=2&_size=10", "method": "GET" },
    "next": { "href": "/v1/users?_page=3&_size=10", "method": "GET" },
    "prev": { "href": "/v1/users?_page=1&_size=10", "method": "GET" },
    "first": { "href": "/v1/users?_page=1&_size=10", "method": "GET" },
    "last": { "href": "/v1/users?_page=10&_size=10", "method": "GET" }
  }
}
```

---

## Filtros via query params

Filtros de negócio usam **snake_case** nos nomes dos parâmetros e não têm prefixo `_`.

```
GET /v1/attendances?class_offering_id=uuid&student_id=uuid
GET /v1/enrollments?class_offering_id=uuid
GET /v1/users?sort_by=name
```

### Implementação no controller

```typescript
@Get()
async findAll(
  @Query("class_offering_id") classOfferingId: string,
  @Query("student_id") studentId?: string,
) {
  if (studentId) {
    return this.service.findByStudentAndClassOffering(studentId, classOfferingId);
  }
  return this.service.findByClassOffering(classOfferingId);
}
```

> Filtros substituem sub-rotas aninhadas como `GET /attendances/student/:id/class-offering/:id`, que violam o limite de dois níveis.

---

## Exemplo completo — ClassOfferings

```typescript
@Controller("classOfferings")   // lowerCamelCase
export class ClassOfferingsController {

  @Get()
  async findAll(
    @Query("_page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("_size", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) { ... }

  @Get(":id")
  async findById(@Param("id") id: string) { ... }

  @Post()
  async create(@Body() body: CreateClassOfferingDto) { ... }

  // Ações descritivas via PATCH — sem body
  @Patch(":id/activate")
  @HttpCode(HttpStatus.NO_CONTENT)
  async activate(@Param("id") id: string) {
    return this.service.changeStatus(id, ClassOfferingStatus.ACTIVE);
  }

  @Patch(":id/deactivate")
  @HttpCode(HttpStatus.NO_CONTENT)
  async deactivate(@Param("id") id: string) {
    return this.service.changeStatus(id, ClassOfferingStatus.INACTIVE);
  }
}
```

---

## Regras resumidas

- Global prefix `v1` definido uma única vez no `main.ts` — nunca colocar a versão no `@Controller`
- `@Controller` recebe sempre o nome da coleção em lowerCamelCase e no plural
- `PUT` e `DELETE` usam `@HttpCode(HttpStatus.NO_CONTENT)` — não retornam body
- Paginação sempre com `_page` e `_size`; filtros de negócio em snake_case sem prefixo
- Sub-rotas aninhadas além de um nível (`/a/:id/b/:id/c`) devem ser substituídas por query params
- Ações não-CRUD usam `PATCH /{id}/ação` — sem body e sem query params
