import { MessagingService } from "@modules/messaging/application/services/messaging.service";
import {
  STUDENT_EVENTS,
  STUDENT_EXCHANGE_TYPE,
} from "@modules/students/infra/messaging/student-events.constants";
import { Injectable, Logger, type OnApplicationBootstrap } from "@nestjs/common";

@Injectable()
export class StudentExchangesInitializer implements OnApplicationBootstrap {
  private readonly logger = new Logger(StudentExchangesInitializer.name);

  constructor(private readonly messagingService: MessagingService) {}

  async onApplicationBootstrap(): Promise<void> {
    for (const event of Object.values(STUDENT_EVENTS)) {
      await this.messagingService.createExchange(
        event.exchange,
        STUDENT_EXCHANGE_TYPE,
      );
      this.logger.log(`Exchange asserted: ${event.exchange}`);
    }
  }
}
