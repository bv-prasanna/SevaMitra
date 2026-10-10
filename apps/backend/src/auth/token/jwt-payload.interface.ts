export interface JwtPayload {
  sub: string;
  phoneNumber: string | null;
  email: string | null;
}

export interface AuthenticatedUser {
  id: string;
  phoneNumber: string | null;
  email: string | null;
}
