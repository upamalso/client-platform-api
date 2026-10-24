import { SetMetadata } from '@nestjs/common';

export const Public = () => SetMetadata('public', true);
export const OwnerOnly = () => SetMetadata('owner', true);
export const CustomerOnly = () => SetMetadata('customer', true);
export const Health = () => SetMetadata('health', true);