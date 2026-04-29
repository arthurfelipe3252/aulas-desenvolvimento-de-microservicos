import type { Student } from "@modules/students/domain/models/student.entity";

export const STUDENT_REPOSITORY = Symbol("STUDENT_REPOSITORY");

export interface StudentRepository {
  create(student: Student): Promise<void>;
  update(student: Student): Promise<void>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Student[]>;
  findPaginated(page: number, limit: number): Promise<{ data: Student[]; total: number }>;
  findById(id: string): Promise<Student | null>;
  findByEmail(email: string): Promise<Student | null>;
}
