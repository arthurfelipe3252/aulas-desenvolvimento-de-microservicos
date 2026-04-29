import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString } from "class-validator";

export class PublishMessageDto {
  @ApiProperty({ example: "Hello RabbitMQ!" })
  @IsString()
  @IsNotEmpty()
  content: string;
}
