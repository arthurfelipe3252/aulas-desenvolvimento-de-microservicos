# RabbitMQ — Publicador e Consumidor

RabbitMQ é um **message broker**: um intermediário que recebe mensagens de um publicador e as entrega a um ou mais consumidores. Neste projeto a comunicação segue o modelo **exchange → fila → consumidor**.

```
Publicador
    │
    ▼
 Exchange  ──(routing key)──▶  Fila  ──▶  Consumidor
```

| Conceito | O que é |
|---|---|
| **Exchange** | Recebe a mensagem do publicador e decide para qual fila enviá-la |
| **Fila** | Armazena as mensagens até que um consumidor as leia |
| **Routing key** | Chave usada pela exchange para rotear a mensagem para a fila correta |
| **Binding** | Vínculo entre exchange e fila via routing key |
| **durable** | Sobrevive ao reinício do broker |
| **persistent** | A mensagem sobrevive ao reinício do broker |

---

## Instalação

```bash
npm install amqplib
npm install -D @types/amqplib
```

---

## Variáveis de ambiente

```env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

Apenas a URL de conexão vai para o `.env`. Os nomes de exchange, fila e routing key ficam como constantes no controller — alterá-los é uma decisão de código, não de ambiente.

---

## Estrutura de arquivos

```
src/modules/messaging/
├── messaging.module.ts
├── application/
│   ├── dto/
│   │   ├── publish-message.dto.ts    ← body do endpoint de publicação
│   │   └── consumed-message.dto.ts  ← resposta do endpoint de consumo
│   └── services/
│       └── messaging.service.ts     ← regras de negócio de mensageria
└── infra/
    ├── controllers/
    │   └── messaging.controller.ts  ← rotas HTTP + constantes de exchange/fila
    └── rabbitmq/
        └── rabbitmq.service.ts      ← conexão e ciclo de vida do canal
```

---

## Passo a passo

### 1. `rabbitmq.service.ts` — Conexão com o broker

Este arquivo é responsável por **abrir a conexão e criar o canal** no momento em que o módulo é iniciado, e por **fechar tudo** quando o módulo é destruído.

```typescript
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { Channel, ChannelModel } from "amqplib";
import amqplib from "amqplib";

@Injectable()
export class RabbitMQService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RabbitMQService.name);
  private connection: ChannelModel;
  private channel: Channel;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const url = this.configService.getOrThrow<string>("RABBITMQ_URL");
    this.connection = await amqplib.connect(url);
    this.channel = await this.connection.createChannel();
    this.logger.log("RabbitMQ connection established");
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
    await this.connection?.close();
  }

  getChannel(): Channel {
    return this.channel;
  }
}
```

| Detalhe | Por quê |
|---|---|
| `OnModuleInit` | Garante que a conexão existe antes de qualquer requisição chegar |
| `OnModuleDestroy` | Fecha o canal e a conexão de forma limpa no shutdown |
| `getChannel()` | Expõe o canal para que os services possam publicar e consumir |

---

### 2. `publish-message.dto.ts` — Body da publicação

```typescript
import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class PublishMessageDto {
  @ApiProperty({ example: "Hello RabbitMQ!" })
  @IsString()
  @IsNotEmpty()
  content: string;
}
```

---

### 3. `consumed-message.dto.ts` — Resposta do consumo

```typescript
import { ApiProperty } from "@nestjs/swagger";

export class ConsumedMessageDto {
  @ApiProperty({ example: "Hello RabbitMQ!" })
  content: string;

  @ApiProperty({ example: "school-control-example.queue" })
  queue: string;

  static from(queue: string, content: string): ConsumedMessageDto {
    const dto = new ConsumedMessageDto();
    dto.content = content;
    dto.queue = queue;
    return dto;
  }
}
```

---

### 4. `messaging.service.ts` — Regras de negócio

O service recebe o `RabbitMQService` por injeção de dependência e usa o canal para executar as operações do broker. Recebe os nomes de exchange, fila e routing key como parâmetros — quem define esses valores é o controller.

```typescript
import { Injectable, NotFoundException } from "@nestjs/common";
import { RabbitMQService } from "@messaging/infra/rabbitmq/rabbitmq.service";
import type { PublishMessageDto } from "../dto/publish-message.dto";
import { ConsumedMessageDto } from "../dto/consumed-message.dto";

@Injectable()
export class MessagingService {
  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async createExchange(name: string, type: string): Promise<void> {
    const channel = this.rabbitMQService.getChannel();
    await channel.assertExchange(name, type, { durable: true });
  }

  async createQueue(queueName: string, exchangeName: string, routingKey: string): Promise<void> {
    const channel = this.rabbitMQService.getChannel();
    await channel.assertQueue(queueName, { durable: true });
    await channel.bindQueue(queueName, exchangeName, routingKey);
  }

  async publish(dto: PublishMessageDto, exchangeName: string, routingKey: string): Promise<void> {
    const channel = this.rabbitMQService.getChannel();
    channel.publish(exchangeName, routingKey, Buffer.from(dto.content), { persistent: true });
  }

  async consume(queueName: string): Promise<ConsumedMessageDto> {
    const channel = this.rabbitMQService.getChannel();
    const msg = await channel.get(queueName, { noAck: false });

    if (!msg) {
      throw new NotFoundException("No messages in queue");
    }

    channel.ack(msg);
    return ConsumedMessageDto.from(queueName, msg.content.toString());
  }
}
```

| Método | O que faz |
|---|---|
| `assertExchange` | Cria a exchange se não existir; não faz nada se já existir com as mesmas opções |
| `assertQueue` | Cria a fila se não existir; não faz nada se já existir com as mesmas opções |
| `bindQueue` | Vincula a fila à exchange via routing key |
| `channel.publish` | Envia a mensagem para a exchange; ela roteia para a fila pelo routing key |
| `channel.get` | **Pull**: lê uma mensagem e retorna imediatamente (`null` se a fila estiver vazia) |
| `channel.ack` | Confirma ao broker que a mensagem foi processada e pode ser removida da fila |

> `channel.get` (pull) é diferente de `channel.consume` (push). O `consume` registra um callback contínuo que dispara a cada nova mensagem — adequado para workers. O `get` é adequado para leitura sob demanda via HTTP, como neste projeto.

---

### 5. `messaging.controller.ts` — Rotas e constantes

As constantes de exchange, fila e routing key ficam no topo do controller. Isso deixa claro que são valores fixos de configuração daquele módulo, sem precisar de env nem de um arquivo de configuração separado.

```typescript
import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MessagingService } from "@messaging/application/services/messaging.service";
import { PublishMessageDto } from "@messaging/application/dto/publish-message.dto";
import { ConsumedMessageDto } from "@messaging/application/dto/consumed-message.dto";
import { Public } from "@shared/infra/decorators/public.decorator";

const EXCHANGE_NAME = "school-control-example";
const EXCHANGE_TYPE = "direct";
const QUEUE_NAME    = "school-control-example.queue";
const ROUTING_KEY   = "school-control-example.key";

@ApiTags("messaging")
@Controller("messaging")
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post("exchange")
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Criar/assegurar a exchange" })
  async createExchange(): Promise<void> {
    return this.messagingService.createExchange(EXCHANGE_NAME, EXCHANGE_TYPE);
  }

  @Post("queue")
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Criar/assegurar a fila e vinculá-la à exchange" })
  async createQueue(): Promise<void> {
    return this.messagingService.createQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);
  }

  @Post("publish")
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Publicar mensagem na exchange" })
  async publish(@Body() body: PublishMessageDto): Promise<void> {
    return this.messagingService.publish(body, EXCHANGE_NAME, ROUTING_KEY);
  }

  @Get("consume")
  @Public()
  @ApiOperation({ summary: "Ler próxima mensagem da fila" })
  async consume(): Promise<ConsumedMessageDto> {
    return this.messagingService.consume(QUEUE_NAME);
  }
}
```

### Tipos de exchange

| Tipo | Comportamento |
|---|---|
| `direct` | Roteia para filas cujo binding key é igual ao routing key da mensagem |
| `fanout` | Envia para todas as filas vinculadas, ignora o routing key |
| `topic` | Roteia por padrão com wildcards (`*` e `#`) no routing key |
| `headers` | Roteia por atributos do cabeçalho da mensagem, ignora o routing key |

---

### 6. `messaging.module.ts` — Registro do módulo

```typescript
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { MessagingService } from "./application/services/messaging.service";
import { MessagingController } from "./infra/controllers/messaging.controller";
import { RabbitMQService } from "./infra/rabbitmq/rabbitmq.service";

@Module({
  imports: [ConfigModule],
  controllers: [MessagingController],
  providers: [RabbitMQService, MessagingService],
})
export class MessagingModule {}
```

O `ConfigModule` é importado para que o `RabbitMQService` consiga injetar o `ConfigService` e ler a `RABBITMQ_URL`.

---

## Ordem de uso

A exchange e a fila precisam existir antes de publicar ou consumir. Na primeira vez que subir o ambiente, execute nesta ordem:

```
POST /v1/messaging/exchange   → cria a exchange no broker
POST /v1/messaging/queue      → cria a fila e faz o bind com a exchange
POST /v1/messaging/publish    → envia mensagens
GET  /v1/messaging/consume    → lê a próxima mensagem da fila
```

`assertExchange` e `assertQueue` são idempotentes: se a exchange ou a fila já existirem com as mesmas opções, nada acontece. Chamá-los novamente não causa erro.
