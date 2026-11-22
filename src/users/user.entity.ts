import { IsNotEmpty, IsOptional } from "class-validator";

export class User {

    @IsNotEmpty()
    sub: string;

    @IsOptional()
    membershipId?: string;

    @IsOptional()
    merchantId?: string;

    @IsOptional()
    storeId?: string;

    @IsOptional()
    role?: string;

    @IsNotEmpty()
    permissions: string[];

    @IsNotEmpty()
    isPlatformAdmin: boolean;
}