-- DropTable: user_profile (auth pasó de Supabase a Better Auth)
DROP TABLE IF EXISTS "public"."user_profile" CASCADE;

-- CreateTable
CREATE TABLE "public"."user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" TEXT DEFAULT 'CAJERO',
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."account" (
    "id" TEXT NOT NULL,
    "issuer" TEXT NOT NULL DEFAULT '',
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."jwks" (
    "id" TEXT NOT NULL,
    "publicKey" TEXT NOT NULL,
    "privateKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "alg" TEXT,
    "crv" TEXT,

    CONSTRAINT "jwks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth_client" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT,
    "clientDiscoveryId" TEXT,
    "disabled" BOOLEAN,
    "skipConsent" BOOLEAN,
    "enableEndSession" BOOLEAN,
    "subjectType" TEXT,
    "scopes" JSONB,
    "clientCredentialsScopes" JSONB,
    "userId" TEXT,
    "name" TEXT,
    "uri" TEXT,
    "icon" TEXT,
    "contacts" JSONB,
    "tos" TEXT,
    "policy" TEXT,
    "softwareId" TEXT,
    "softwareVersion" TEXT,
    "softwareStatement" TEXT,
    "redirectUris" JSONB,
    "postLogoutRedirectUris" JSONB,
    "backchannelLogoutUri" TEXT,
    "backchannelLogoutSessionRequired" BOOLEAN,
    "tokenEndpointAuthMethod" TEXT,
    "applicationType" TEXT,
    "jwks" TEXT,
    "jwksUri" TEXT,
    "grantTypes" JSONB,
    "responseTypes" JSONB,
    "requirePKCE" BOOLEAN,
    "dpopBoundAccessTokens" BOOLEAN,
    "referenceId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "oauth_client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth_resource" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accessTokenTtl" INTEGER,
    "refreshTokenTtl" INTEGER,
    "signingAlgorithm" TEXT,
    "signingKeyId" TEXT,
    "allowedScopes" JSONB,
    "customClaims" JSONB,
    "dpopBoundAccessTokensRequired" BOOLEAN,
    "disabled" BOOLEAN,
    "policyVersion" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "oauth_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth_client_resource" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_client_resource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth_refresh_token" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT NOT NULL,
    "referenceId" TEXT,
    "authorizationCodeId" TEXT,
    "resources" JSONB,
    "requestedUserInfoClaims" JSONB,
    "scopes" JSONB,
    "expiresAt" TIMESTAMP(3),
    "revoked" TIMESTAMP(3),
    "rotatedAt" TIMESTAMP(3),
    "rotationReplayResponse" TEXT,
    "rotationReplayExpiresAt" TIMESTAMP(3),
    "authTime" TIMESTAMP(3),
    "confirmation" JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_refresh_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth_access_token" (
    "id" TEXT NOT NULL,
    "token" TEXT,
    "clientId" TEXT NOT NULL,
    "sessionId" TEXT,
    "userId" TEXT,
    "referenceId" TEXT,
    "authorizationCodeId" TEXT,
    "refreshId" TEXT,
    "resources" JSONB,
    "requestedUserInfoClaims" JSONB,
    "scopes" JSONB,
    "expiresAt" TIMESTAMP(3),
    "revoked" TIMESTAMP(3),
    "confirmation" JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_access_token_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth_consent" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "userId" TEXT,
    "referenceId" TEXT,
    "resources" JSONB,
    "requestedUserInfoClaims" JSONB,
    "scopes" JSONB,
    "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3),

    CONSTRAINT "oauth_consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."oauth_client_assertion" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oauth_client_assertion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "public"."user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "public"."session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "public"."session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "public"."account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "public"."verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_client_clientId_key" ON "public"."oauth_client"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_resource_identifier_key" ON "public"."oauth_resource"("identifier");

-- CreateIndex
CREATE INDEX "oauth_client_resource_clientId_idx" ON "public"."oauth_client_resource"("clientId");

-- CreateIndex
CREATE INDEX "oauth_client_resource_resourceId_idx" ON "public"."oauth_client_resource"("resourceId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_refresh_token_token_key" ON "public"."oauth_refresh_token"("token");

-- CreateIndex
CREATE INDEX "oauth_refresh_token_clientId_idx" ON "public"."oauth_refresh_token"("clientId");

-- CreateIndex
CREATE INDEX "oauth_refresh_token_userId_idx" ON "public"."oauth_refresh_token"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_access_token_token_key" ON "public"."oauth_access_token"("token");

-- CreateIndex
CREATE INDEX "oauth_access_token_clientId_idx" ON "public"."oauth_access_token"("clientId");

-- CreateIndex
CREATE INDEX "oauth_consent_clientId_idx" ON "public"."oauth_consent"("clientId");

-- CreateIndex
CREATE INDEX "oauth_consent_userId_idx" ON "public"."oauth_consent"("userId");

-- AddForeignKey
ALTER TABLE "public"."session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

