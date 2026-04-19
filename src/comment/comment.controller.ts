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
  UseGuards,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { UUIDDto } from 'src/common/dto/uuid.dto';
import { SearchCommentDto } from './dto/search-comment.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';
import { UserRole } from 'src/common/enums';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.EDITOR)
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

  @Roles(UserRole.ADMIN, UserRole.EDITOR)
  @Patch(':id')
  update(@Param() params: UUIDDto, @Body() updateCommentDto: UpdateCommentDto) {
    return this.commentService.update(params.id, updateCommentDto);
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param() params: UUIDDto) {
    return this.commentService.remove(params.id);
  }
}
