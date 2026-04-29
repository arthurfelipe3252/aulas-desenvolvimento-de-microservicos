import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { MessagingService } from "@modules/messaging/application/services/messaging.service";
import { PublishMessageDto } from "@modules/messaging/application/dto/publish-message.dto";
import { ConsumedMessageDto } from "@modules/messaging/application/dto/consumed-message.dto";

const EXCHANGE_NAME = "school-control-example";
const EXCHANGE_TYPE = "direct";

const QUEUE_NAME = "school-control-example.queue";
const ROUTING_KEY = "school-control-example.key";

@ApiTags("messaging")
@Controller("messaging")
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post("exchange")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Criar/assegurar a exchange" })
  async createExchange(): Promise<void> {
    return this.messagingService.createExchange(EXCHANGE_NAME, EXCHANGE_TYPE);
  }

  @Post("queue")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Criar/assegurar a fila e vinculá-la à exchange" })
  async createQueue(): Promise<void> {
    return this.messagingService.createQueue(
      QUEUE_NAME,
      EXCHANGE_NAME,
      ROUTING_KEY,
    );
  }

  @Post("publish")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Publicar mensagem na exchange" })
  async publish(@Body() body: PublishMessageDto): Promise<void> {
    return this.messagingService.publish(body, EXCHANGE_NAME, ROUTING_KEY);
  }

  @Get("consume")
  @ApiOperation({ summary: "Ler próxima mensagem da fila" })
  async consume(): Promise<ConsumedMessageDto> {
    return this.messagingService.consume(QUEUE_NAME);
  }
}
