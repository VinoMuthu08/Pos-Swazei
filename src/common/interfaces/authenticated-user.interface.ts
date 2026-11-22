
export interface AuthenticatedUser {
  sub: string;
  membershipId?: string | null;
  merchantId?: string | null;
  storeId?: string | null;
  role?: string | null;
  permissions: string[];
  isPlatformAdmin: boolean;
}
