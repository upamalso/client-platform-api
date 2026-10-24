import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;

export class AvailabilityDto {
  @IsString()
  @Matches(/^[a-z0-9-]{1,60}$/)
  serviceId!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date!: string;
}

export class BookingDto extends AvailabilityDto {
  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  time!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  firstName!: string;

  @Transform(trim)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  lastName!: string;

  @Transform(({ value }: { value: unknown }) => typeof value === 'string' ? value.trim().toLowerCase() : value)
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @Transform(trim)
  @IsString()
  @Matches(/^[0-9+()\s-]{7,30}$/)
  phone!: string;

  @IsOptional()
  @IsBoolean()
  newClient?: boolean;

  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(1000)
  notes?: string;
}

export class ListBookingsDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  date?: string;

  @IsOptional()
  @IsIn(['confirmed', 'cancelled', 'completed'])
  status?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 50;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
}

export class BookingStatusDto {
  @IsIn(['cancelled', 'completed'])
  status!: 'cancelled' | 'completed';
}

export class CustomerBookingsDto {
  @IsIn(['upcoming', 'past'])
  period: 'upcoming' | 'past' = 'upcoming';

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit = 25;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  page = 1;
}