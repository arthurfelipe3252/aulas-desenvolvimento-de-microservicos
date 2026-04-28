# Validation

Validação de entrada garante que os dados recebidos nas rotas atendam às regras de formato e obrigatoriedade antes de chegarem ao service ou ao domínio.

## Como funciona neste projeto

A implementação usa o **`ValidationPipe` global** registrado no `main.ts` + **decorators do `class-validator`** nas classes de DTO de entrada. O pipe intercepta cada request, transforma o body em uma instância da classe (`class-transformer`) e executa as validações. Se algum campo falhar, a resposta é um `400 Bad Request` automático com a lista de erros.

```
Request body (JSON)
  └── ValidationPipe (global)
        ├── plainToInstance(DtoClass, body)   ← class-transformer
        └── validate(instance)                ← class-validator
              ├── OK  → segue para o controller
              └── FAIL → 400 Bad Request
```

## Configuração global — `main.ts`

```typescript
import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // remove campos não declarados no DTO
      forbidNonWhitelisted: true, // rejeita requests com campos extras
      transform: true,          // converte tipos (ex: string → Date)
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

| Opção                  | Efeito                                                             |
| ---------------------- | ------------------------------------------------------------------ |
| `whitelist`            | Remove silenciosamente propriedades sem decorator no DTO           |
| `forbidNonWhitelisted` | Retorna `400` se o body contiver propriedades não declaradas       |
| `transform`            | Usa `class-transformer` para converter os valores para o tipo certo |

---

## Padrão de DTOs neste projeto

Cada módulo separa os DTOs em dois grupos:

| Grupo     | Responsabilidade                              | Tem validação? |
| --------- | --------------------------------------------- | -------------- |
| **Input** | Recebe dados do cliente (`@Body()`)           | Sim            |
| **Response** | Mapeia a entidade para a resposta da API   | Não            |

### Exemplo — Students

```typescript
// DTO de entrada (com validação)
export class CreateStudentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  document: string;

  @IsString()
  @IsNotEmpty()
  registration: string;
}

export class UpdateStudentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  document?: string;

  @IsString()
  @IsOptional()
  registration?: string;
}

// DTO de resposta (sem validação — construtor privado + static from)
export class StudentDto {
  private constructor(
    public id: string | undefined,
    public name: string,
    public email: string,
    public document: string,
    public registration: string,
  ) {}

  static fromStudent(student: Student | null): StudentDto | null { ... }
}
```

---

## Decorators disponíveis

### Strings

```typescript
@IsString()        // deve ser uma string
@IsNotEmpty()      // não pode ser vazia (nem null, nem undefined, nem "")
@IsOptional()      // ignora as demais validações se o campo não for enviado
@IsEmail()         // formato de e-mail válido
@IsUUID()          // formato UUID v4
@IsEnum(MyEnum)    // valor deve pertencer ao enum
```

### Números

```typescript
@IsInt()           // deve ser um inteiro
@IsPositive()      // deve ser maior que 0
@IsNumber()        // qualquer número
```

### Arrays

```typescript
@IsArray()                         // deve ser um array
@IsEnum(MyEnum, { each: true })    // cada elemento deve pertencer ao enum
```

### Datas

```typescript
@Type(() => Date)   // converte a string ISO para Date (class-transformer)
@IsDate()           // valida que o valor é uma instância de Date
```

> `@Type(() => Date)` só funciona com `transform: true` no `ValidationPipe`.

---

## Exemplo completo de implementação — Teachers

### DTO

```typescript
import { Type } from "class-transformer";
import { IsDate, IsEmail, IsNotEmpty, IsOptional, IsString } from "class-validator";

export class CreateTeacherDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  document: string;

  @IsString()
  @IsNotEmpty()
  degree: string;

  @IsString()
  @IsNotEmpty()
  specialization: string;

  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  admissionDate: Date;
}

export class UpdateTeacherDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  document?: string;

  @IsString()
  @IsOptional()
  degree?: string;

  @IsString()
  @IsOptional()
  specialization?: string;

  @Type(() => Date)
  @IsDate()
  @IsOptional()
  admissionDate?: Date;
}
```

### Controller

```typescript
@Post()
async create(@Body() body: CreateTeacherDto) {
  return this.teacherService.create(body);
}

@Put(":id")
async update(@Param("id") id: string, @Body() body: UpdateTeacherDto) {
  return this.teacherService.edit(id, body);
}
```

### Service

```typescript
async create(dto: CreateTeacherDto): Promise<void> { ... }
async edit(id: string, dto: UpdateTeacherDto): Promise<void> { ... }
```

---

## Regras

- DTOs de **input** (`Create*Dto`, `Update*Dto`) sempre têm decorators de validação em todos os campos
- DTOs de **resposta** (`*Dto` com `static from`) não recebem decorators — não são instanciados pelo pipe
- Campos obrigatórios usam `@IsNotEmpty()` (nunca confiar só no tipo TypeScript)
- Campos opcionais usam `@IsOptional()` como **primeiro** decorator da cadeia; os demais só são avaliados se o valor existir
- Campos do tipo `Date` recebem `@Type(() => Date)` para que o `class-transformer` faça a conversão automática da string ISO
- Nunca colocar lógica de negócio no DTO — sua responsabilidade é apenas validar o formato da entrada
