import { PartialType } from '@nestjs/mapped-types';
import { RestockInventoryDto } from './create-inventory.dto';

export class UpdateInventoryDto extends PartialType(RestockInventoryDto) {}
