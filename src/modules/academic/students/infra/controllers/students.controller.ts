import { CreateStudentDto } from "@academic/students/application/dto/create-student.dto";
import { StudentDto } from "@academic/students/application/dto/student.dto";
import { UpdateStudentDto } from "@academic/students/application/dto/update-student.dto";
import { StudentService } from "@academic/students/application/services/student.service";
import {
  Body,
  Controller,
  DefaultValuePipe,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
} from "@nestjs/common";
import { ApiNoContentResponse, ApiNotFoundResponse, ApiOperation, ApiQuery, ApiTags } from "@nestjs/swagger";
import { HateoasItem, HateoasList } from "@shared/infra/hateoas";

@ApiTags("students")
@Controller("students")
export class StudentsController {
  constructor(private readonly studentService: StudentService) {}

  @Get()
  @ApiOperation({ summary: "Listar estudantes" })
  @ApiQuery({ name: "_page", required: false, type: Number })
  @ApiQuery({ name: "_size", required: false, type: Number })
  @HateoasList<StudentDto>({
    basePath: "/v1/students",
    itemLinks: (item) => ({
      self: { href: `/v1/students/${item.id}`, method: "GET" },
      update: { href: `/v1/students/${item.id}`, method: "PUT" },
      delete: { href: `/v1/students/${item.id}`, method: "DELETE" },
    }),
  })
  async findAll(
    @Query("_page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("_size", new DefaultValuePipe(10), ParseIntPipe) limit: number,
  ) {
    return this.studentService.listPaginated({ page, limit });
  }

  @Get(":id")
  @ApiOperation({ summary: "Buscar estudante por ID" })
  @ApiNotFoundResponse({ description: "Estudante não encontrado" })
  @HateoasItem<StudentDto>({
    basePath: "/v1/students",
    itemLinks: (item) => ({
      self: { href: `/v1/students/${item.id}`, method: "GET" },
      update: { href: `/v1/students/${item.id}`, method: "PUT" },
      delete: { href: `/v1/students/${item.id}`, method: "DELETE" },
      list: { href: "/v1/students", method: "GET" },
      create: { href: "/v1/students", method: "POST" },
    }),
  })
  async findById(@Param("id") id: string) {
    return this.studentService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: "Criar estudante" })
  async create(@Body() body: CreateStudentDto) {
    return this.studentService.create(body);
  }

  @Put(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Atualizar estudante" })
  @ApiNoContentResponse({ description: "Estudante atualizado" })
  @ApiNotFoundResponse({ description: "Estudante não encontrado" })
  async update(@Param("id") id: string, @Body() body: UpdateStudentDto) {
    return this.studentService.edit(id, body);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remover estudante" })
  @ApiNoContentResponse({ description: "Estudante removido" })
  @ApiNotFoundResponse({ description: "Estudante não encontrado" })
  async remove(@Param("id") id: string) {
    return this.studentService.remove(id);
  }
}
