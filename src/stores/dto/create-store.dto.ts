import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  address?: string;

  // Required for platform admins.
  // Ignored for normal merchant users.
  @IsOptional()
  @IsString()
  merchantId?: string;
}