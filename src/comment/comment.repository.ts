import { Comment } from 'src/common/interfaces';

export class CommentRepository {
  private readonly comments = new Map<string, Comment>();

  findAll(): Comment[] {
    return Array.from(this.comments.values());
  }

  findById(id: string): Comment | undefined {
    return this.comments.get(id);
  }

  create(comment: Comment): Comment {
    this.comments.set(comment.id, comment);
    return comment;
  }

  update(id: string, updatedComment: Partial<Comment>): Comment | undefined {
    const existingComment = this.comments.get(id);
    if (!existingComment) return undefined;
    const newComment = { ...existingComment, ...updatedComment };
    this.comments.set(id, newComment);
    return newComment;
  }

  delete(id: string): boolean {
    return this.comments.delete(id);
  }
}
