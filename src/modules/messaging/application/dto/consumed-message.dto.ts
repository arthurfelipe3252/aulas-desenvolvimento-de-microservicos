import { ApiProperty } from "@nestjs/swagger";

export class ConsumedMessageDto {
  @ApiProperty({ example: "Hello RabbitMQ!" })
  content: string;

  @ApiProperty({ example: "messages" })
  queue: string;

  static from(queue: string, content: string): ConsumedMessageDto {
    const dto = new ConsumedMessageDto();
    dto.content = content;
    dto.queue = queue;
    return dto;
  }
}
