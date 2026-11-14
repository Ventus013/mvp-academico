import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

const trimmed = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const code = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toUpperCase() : value;

export class ProductInput {
  @Transform(code) @IsString() @Length(1, 40) @Matches(/^[A-Z0-9_-]+$/)
  sku!: string;
  @Transform(trimmed) @IsString() @Length(1, 120)
  name!: string;
  @IsOptional() @Transform(trimmed) @IsString() @Length(0, 1000)
  description?: string;
}
export class ProcessInput {
  @Transform(code) @IsString() @Length(1, 40) @Matches(/^[A-Z0-9_-]+$/)
  code!: string;
  @Transform(trimmed) @IsString() @Length(1, 120)
  name!: string;
}
export class AssociationInput {
  @IsInt() @Min(1) @Max(10000)
  position!: number;
}
export class PageQuery {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100)
  limit = 20;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(1000000)
  offset = 0;
}
