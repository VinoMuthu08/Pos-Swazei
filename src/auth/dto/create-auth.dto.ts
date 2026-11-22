import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  // Required only when the user has multiple memberships.
  @IsOptional()
  @IsString()
  membershipId?: string;
}