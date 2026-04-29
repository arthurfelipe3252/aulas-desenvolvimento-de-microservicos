import { MessagingModule } from "@modules/messaging/messaging.module";
import { StudentService } from "@modules/students/application/services/student.service";
import { STUDENT_REPOSITORY } from "@modules/students/domain/repositories/student-repository.interface";
import { StudentsController } from "@modules/students/infra/controllers/students.controller";
import { StudentExchangesInitializer } from "@modules/students/infra/messaging/student-exchanges.initializer";
import { DrizzleStudentRepository } from "@modules/students/infra/repositories/drizzle-student.repository";
import { Module } from "@nestjs/common";
import { SharedModule } from "@shared/shared.module";

@Module({
  imports: [SharedModule, MessagingModule],
  controllers: [StudentsController],
  providers: [
    StudentService,
    DrizzleStudentRepository,
    StudentExchangesInitializer,
    {
      provide: STUDENT_REPOSITORY,
      useExisting: DrizzleStudentRepository,
    },
  ],
})
export class StudentsModule {}
