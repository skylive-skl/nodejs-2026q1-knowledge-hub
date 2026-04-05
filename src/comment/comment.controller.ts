import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UUIDDto } from 'src/common/dto/uuid.dto';
import { SearchCommentDto } from './dto/search-comment.dto';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  create(@Body() createCommentDto: CreateCommentDto) {
    return this.commentService.create(createCommentDto);
  }

  @Get()
  findAll(@Query() query: SearchCommentDto) {
    return this.commentService.findAll(query);
  }

  @Get(':id')
  findOne(@Param() params: UUIDDto) {
    return this.commentService.findOne(params.id);
  }

  @Patch(':id')
  update(@Param() params: UUIDDto, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentService.update(params.id, updateCommentDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param() params: UUIDDto) {
    return this.commentService.remove(params.id);
  }
}
