import { BadRequestException, Body, Controller, Get, Headers, Inject, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { isUUID } from 'class-validator';
import { TenantRequest } from '../common/context';
import { CustomerOnly, OwnerOnly, Public } from '../security/access';
import { AvailabilityDto, BookingDto, BookingStatusDto, CustomerBookingsDto, ListBookingsDto } from './booking.dto';
import { BookingService } from './booking.service';

@Controller('public')
export class PublicBookingController {
  constructor(@Inject(BookingService) private readonly bookings: BookingService) {}

  @Public()
  @Get('business')
  business(@Req() request: TenantRequest) { return this.bookings.business(request.tenant); }

  @Public()
  @Get('availability')
  availability(@Req() request: TenantRequest, @Query() query: AvailabilityDto) {
    return this.bookings.availability(request.tenant, query);
  }

  @Public()
  @Post('appointments')
  book(@Req() request: TenantRequest, @Body() body: BookingDto, @Headers('idempotency-key') key?: string) {
    if (!key || !isUUID(key, '4')) throw new BadRequestException('Supply a UUID v4 Idempotency-Key header');
    return this.bookings.book(request.tenant, body, key);
  }
}

@Controller('owner')
export class OwnerBookingController {
  constructor(@Inject(BookingService) private readonly bookings: BookingService) {}

  @OwnerOnly()
  @Get('appointments')
  list(@Req() request: TenantRequest, @Query() query: ListBookingsDto) {
    return this.bookings.list(request.tenant, query);
  }

  @OwnerOnly()
  @Patch('appointments/:id/status')
  status(@Req() request: TenantRequest, @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() body: BookingStatusDto) {
    return this.bookings.changeStatus(request.tenant, id, body.status);
  }
}

@Controller('customer')
export class CustomerBookingController {
  constructor(@Inject(BookingService) private readonly bookings: BookingService) {}

  @CustomerOnly()
  @Get('appointments')
  list(@Req() request: TenantRequest, @Query() query: CustomerBookingsDto) {
    return this.bookings.listCustomer(request.tenant, request.identity!.id, query);
  }

  @CustomerOnly()
  @Post('appointments')
  book(@Req() request: TenantRequest, @Body() body: BookingDto, @Headers('idempotency-key') key?: string) {
    if (!key || !isUUID(key, '4')) throw new BadRequestException('Supply a UUID v4 Idempotency-Key header');
    return this.bookings.book(request.tenant, body, key, request.identity!.id);
  }
}