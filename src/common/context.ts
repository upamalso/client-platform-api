import { Request } from 'express';
import { Tenant } from '../config';

export interface Identity {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'CUSTOMER';
  csrfToken: string;
  tokenHash: string;
}

export interface TenantRequest extends Request {
  tenant: Tenant;
  identity?: Identity;
  requestId: string;
}