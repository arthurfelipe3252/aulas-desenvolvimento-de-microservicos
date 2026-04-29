import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { SharedModule } from "@shared/shared.module";
import { MessagingModule } from "@modules/messaging/messaging.module";
import { StudentsModule } from "@modules/students/students.module";

@Module({
  imports: [ConfigModule.forRoot(), SharedModule, MessagingModule, StudentsModule],
})
export class AppModule {}
