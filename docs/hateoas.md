# HATEOAS

HATEOAS (Hypermedia as the Engine of Application State) é um princípio REST onde cada resposta inclui links que descrevem as ações disponíveis para aquele recurso.

## Como funciona neste projeto

A implementação usa um **Interceptor global** + **decorators** nos métodos dos controllers. O interceptor lê os metadados do decorator e transforma a resposta automaticamente. Rotas sem decorator passam sem alteração.

```
Controller method
  └── @HateoasList / @HateoasItem  ← define os links
        └── HateoasInterceptor      ← transforma a resposta
```

## Arquivos

```
src/shared/infra/hateoas/
├── hateoas.types.ts
├── hateoas-list.decorator.ts
├── hateoas-item.decorator.ts
├── hateoas.interceptor.ts
└── index.ts
```

---

## `hateoas.types.ts`

```typescript
export interface LinkDef {
  href: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
}

export type LinksMap = Record<string, LinkDef | null>;

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
```

## `hateoas-list.decorator.ts`

```typescript
import { SetMetadata } from "@nestjs/common";
import type { LinksMap } from "./hateoas.types";

export const HATEOAS_LIST_KEY = "hateoas:list";

export interface HateoasListOptions<T = Record<string, unknown>> {
  basePath: string;
  itemLinks: (item: T) => LinksMap;
}

export const HateoasList = <T>(options: HateoasListOptions<T>) =>
  SetMetadata(HATEOAS_LIST_KEY, options);
```

## `hateoas-item.decorator.ts`

```typescript
import { SetMetadata } from "@nestjs/common";
import type { LinksMap } from "./hateoas.types";

export const HATEOAS_ITEM_KEY = "hateoas:item";

export interface HateoasItemOptions<T = Record<string, unknown>> {
  basePath: string;
  itemLinks: (item: T) => LinksMap;
}

export const HateoasItem = <T>(options: HateoasItemOptions<T>) =>
  SetMetadata(HATEOAS_ITEM_KEY, options);
```

## `hateoas.interceptor.ts`

```typescript
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import type { PaginatedResult } from "./hateoas.types";
import { HATEOAS_ITEM_KEY, type HateoasItemOptions } from "./hateoas-item.decorator";
import { HATEOAS_LIST_KEY, type HateoasListOptions } from "./hateoas-list.decorator";

@Injectable()
export class HateoasInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const listOptions = this.reflector.get<HateoasListOptions>(
      HATEOAS_LIST_KEY,
      context.getHandler(),
    );
    const itemOptions = this.reflector.get<HateoasItemOptions>(
      HATEOAS_ITEM_KEY,
      context.getHandler(),
    );

    if (!listOptions && !itemOptions) {
      return next.handle();
    }

    const request = context
      .switchToHttp()
      .getRequest<{ query: Record<string, string> }>();

    return next.handle().pipe(
      map((data: unknown) => {
        if (listOptions) {
          return this.transformList(
            data as PaginatedResult<Record<string, unknown>>,
            listOptions,
            request.query,
          );
        }
        return this.transformItem(
          data as Record<string, unknown> | null,
          itemOptions!,
        );
      }),
    );
  }

  private transformList(
    paginated: PaginatedResult<Record<string, unknown>>,
    options: HateoasListOptions,
    _query: Record<string, string>,
  ) {
    const { data, total, page, limit } = paginated;
    const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
    const { basePath } = options;

    const itemsWithLinks = data.map((item) => ({
      ...item,
      _links: options.itemLinks(item),
    }));

    return {
      data: itemsWithLinks,
      meta: {
        totalItems: total,
        itemsPerPage: limit,
        currentPage: page,
        totalPages,
      },
      _links: {
        self: { href: `${basePath}?page=${page}&limit=${limit}`, method: "GET" },
        next: page < totalPages
          ? { href: `${basePath}?page=${page + 1}&limit=${limit}`, method: "GET" }
          : null,
        prev: page > 1
          ? { href: `${basePath}?page=${page - 1}&limit=${limit}`, method: "GET" }
          : null,
        first: { href: `${basePath}?page=1&limit=${limit}`, method: "GET" },
        last: { href: `${basePath}?page=${totalPages}&limit=${limit}`, method: "GET" },
        create: { href: basePath, method: "POST" },
      },
    };
  }

  private transformItem(
    item: Record<string, unknown> | null,
    options: HateoasItemOptions,
  ) {
    if (!item) return null;
    return {
      ...item,
      _links: options.itemLinks(item),
    };
  }
}
```

## `index.ts`

```typescript
export * from "./hateoas.interceptor";
export * from "./hateoas.types";
export * from "./hateoas-item.decorator";
export * from "./hateoas-list.decorator";
```

---

## Exemplo de implementação — Students

### Controller

```typescript
import { StudentDto } from "@academic/students/application/dto/student.dto";
import { StudentService } from "@academic/students/application/services/student.service";
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { Permission } from "@shared/domain/enums/permission.enum";
import { RequirePermissions } from "@shared/infra/decorators/permissions.decorator";
import { HateoasItem, HateoasList } from "@shared/infra/hateoas";

@Controller("students")
export class StudentsController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @RequirePermissions(Permission.STUDENTS_READ)
  @HateoasList<StudentDto>({
    basePath: "/students",
    itemLinks: (item) => ({
      self: { href: `/students/${item.id}`, method: "GET" },
      update: { href: `/students/${item.id}`, method: "PUT" },
      delete: { href: `/students/${item.id}`, method: "DELETE" },
    }),
  })
  async findAll(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("limit", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.studentService.listPaginated({ page, limit });
  }

  @Get(":id")
  @RequirePermissions(Permission.STUDENTS_READ)
  @HateoasItem<StudentDto>({
    basePath: "/students",
    itemLinks: (item) => ({
      self: { href: `/students/${item.id}`, method: "GET" },
      update: { href: `/students/${item.id}`, method: "PUT" },
      delete: { href: `/students/${item.id}`, method: "DELETE" },
      list: { href: "/students", method: "GET" },
      create: { href: "/students", method: "POST" },
    }),
  })
  async findById(@Param("id") id: string) {
    return this.studentService.findById(id);
  }

  @Post()
  @RequirePermissions(Permission.STUDENTS_WRITE)
  async create(@Body() body: StudentDto) {
    return this.studentService.create(body);
  }

  @Put(":id")
  @RequirePermissions(Permission.STUDENTS_WRITE)
  async update(@Param("id") id: string, @Body() body: StudentDto) {
    return this.studentService.edit(id, body);
  }

  @Delete(":id")
  @RequirePermissions(Permission.STUDENTS_DELETE)
  async remove(@Param("id") id: string) {
    return this.studentService.remove(id);
  }
}
```

### Regras

- `@HateoasList` — usado em `GET /` com paginação; o service deve retornar `PaginatedResult<T>`
- `@HateoasItem` — usado em `GET /:id`; o service retorna `T | null` normalmente
- `POST`, `PUT`, `PATCH`, `DELETE` não recebem decorator — o interceptor passa sem alterar
- Links condicionais: retorne `null` no `itemLinks` quando a ação não se aplica ao estado atual do recurso
