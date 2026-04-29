import type { Student } from "@modules/students/domain/models/student.entity";
import { ApiProperty } from "@nestjs/swagger";

export class StudentDto {
  @ApiProperty()
  id: string | undefined;

  @ApiProperty()
  name: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  document: string;

  @ApiProperty()
  registration: string;

  private constructor(
    id: string | undefined,
    name: string,
    email: string,
    document: string,
    registration: string,
  ) {
    this.id = id;
    this.name = name;
    this.email = email;
    this.document = document;
    this.registration = registration;
  }

  public static from(student: Student | null): StudentDto | null {
    if (!student) return null;
    return new StudentDto(
      student.id,
      student.name,
      student.email,
      student.document,
      student.registration,
    );
  }
}
