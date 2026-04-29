import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { RabbitMQService } from "@modules/messaging/infra/rabbitmq/rabbitmq.service";
import type { Channel } from "amqplib";

const EXCHANGE_NAME = "school-control-example";
const EXCHANGE_TYPE = "direct";
const QUEUE_NAME = "school-control-example.queue";
const ROUTING_KEY = "school-control-example.key";

@Injectable()
export class MessageConsumerService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(MessageConsumerService.name);
  private channel!: Channel;

  constructor(private readonly rabbitMQService: RabbitMQService) {}

  async onApplicationBootstrap(): Promise<void> {
    this.channel = await this.rabbitMQService.createChannel();

    await this.channel.assertExchange(EXCHANGE_NAME, EXCHANGE_TYPE, { durable: true });
    await this.channel.assertQueue(QUEUE_NAME, { durable: true });
    await this.channel.bindQueue(QUEUE_NAME, EXCHANGE_NAME, ROUTING_KEY);

    await this.channel.consume(QUEUE_NAME, (msg) => {
      if (!msg) return;
      const content = msg.content.toString();
      this.logger.log(`Mensagem recebida da fila "${QUEUE_NAME}": ${content}`);
      this.channel.ack(msg);
    });

    this.logger.log(`Consumer registrado na fila "${QUEUE_NAME}"`);
  }

  async onModuleDestroy(): Promise<void> {
    await this.channel?.close();
  }
}
