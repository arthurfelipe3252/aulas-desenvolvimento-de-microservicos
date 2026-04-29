import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
// import { MessageConsumerService } from "./application/services/message-consumer.service";
import { MessagingService } from "./application/services/messaging.service";
import { MessagingController } from "./infra/controllers/messaging.controller";
import { RabbitMQService } from "./infra/rabbitmq/rabbitmq.service";

@Module({
  imports: [ConfigModule],
  controllers: [MessagingController],
  providers: [RabbitMQService, MessagingService], // MessageConsumerService
  exports: [MessagingService],
})
export class MessagingModule {}
