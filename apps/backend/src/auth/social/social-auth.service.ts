import { Injectable, NotImplementedException } from '@nestjs/common';

export interface VerifiedSocialIdentity {
  providerUserId: string;
  email?: string;
}

/**
 * STUB — not wired to Google/Apple yet.
 *
 * docs/ARCHITECTURE.md confirmed social login (Google/Apple) as part of the
 * auth strategy, but GOOGLE_CLIENT_ID/APPLE_CLIENT_ID are not provisioned
 * (see docs/ARCHITECTURE.md §20 provisioning checklist), so real
 * verification isn't implemented yet. The controller/DTO contract exists
 * now so the frontend team can integrate against it; wire this up once
 * credentials exist:
 *   - Google: `google-auth-library`'s OAuth2Client.verifyIdToken()
 *   - Apple: verify the identity token's JWS against Apple's published JWKS
 *     (https://appleid.apple.com/auth/keys), checking aud === APPLE_CLIENT_ID
 */
@Injectable()
export class SocialAuthService {
  verifyGoogleIdToken(_idToken: string): Promise<VerifiedSocialIdentity> {
    throw new NotImplementedException(
      'Google sign-in is not yet configured on this environment',
    );
  }

  verifyAppleIdToken(_idToken: string): Promise<VerifiedSocialIdentity> {
    throw new NotImplementedException(
      'Apple sign-in is not yet configured on this environment',
    );
  }
}
