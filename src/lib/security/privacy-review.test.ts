import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const PROJECT_ROOT = process.cwd();
const SOURCE_ROOT = join(PROJECT_ROOT, "src");
const SERVER_SECRET_NAMES = [
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "AI_API_KEY",
  "SUPABASE_SECRET_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SERVICE_ROLE_KEY",
  "CLOUDFLARE_TUNNEL_TOKEN",
];

function main() {
  const sourceFiles = listSourceFiles(SOURCE_ROOT);
  const productionFiles = sourceFiles.filter((file) => !file.endsWith(".test.ts"));

  for (const file of productionFiles) {
    const content = readFileSync(file, "utf8");
    const label = relative(PROJECT_ROOT, file);

    assert.doesNotMatch(
      content,
      /\bconsole\.(debug|error|info|log|warn)\s*\(/,
      `${label} should not log scan content or prompts`,
    );
  }

  for (const file of productionFiles.filter(isClientComponent)) {
    const content = readFileSync(file, "utf8");
    const label = relative(PROJECT_ROOT, file);

    assert.doesNotMatch(content, /process\.env/, `${label} should not read server env vars`);

    for (const secretName of SERVER_SECRET_NAMES) {
      assert.equal(
        content.includes(secretName),
        false,
        `${label} should not reference server secret ${secretName}`,
      );
    }
  }

  const routeContent = readProjectFile("src/app/api/analyze/route.ts");
  const feedbackRouteContent = readProjectFile("src/app/api/feedback/route.ts");
  const authCallbackContent = readProjectFile("src/app/auth/callback/route.ts");
  const authRedirectContent = readProjectFile("src/app/auth/callback/redirect.ts");
  const oauthReturnContent = readProjectFile("src/lib/auth/oauth-return.ts");
  const middlewareContent = readProjectFile("src/middleware.ts");
  const accountPageContent = readProjectFile("src/app/account/page.tsx");
  const accountDeletionContent = readProjectFile("src/app/account/delete/route.ts");
  const accountDeletionTokenContent = readProjectFile(
    "src/lib/security/account-deletion-token.ts",
  );
  const accountMutationTokenContent = readProjectFile(
    "src/lib/security/account-mutation-token.ts",
  );
  const accountLanguageContent = readProjectFile("src/app/account/language/route.ts");
  const accountConfig = readProjectFile("src/lib/accounts/config.ts");
  const signOutRouteContent = readProjectFile("src/app/auth/sign-out/route.ts");
  const supabaseConfig = readProjectFile("supabase/config.toml");
  const accountRequestGuard = readProjectFile("src/lib/security/account-request.ts");
  const scannerPageContent = readProjectFile("src/app/app/page.tsx");
  const feedbackMigration = readProjectFile(
    "supabase/migrations/20260710150000_create_detection_feedback.sql",
  );
  const licenseContent = readProjectFile("LICENSE");
  const packageMetadata = JSON.parse(readProjectFile("package.json")) as {
    license?: string;
  };
  const nextConfigContent = readProjectFile("next.config.ts");
  const cspConfig = readProjectFile("src/lib/security/csp.ts");
  const dockerfileContent = readProjectFile("Dockerfile");
  const composeContent = readProjectFile("docker-compose.production.yml");
  const deploymentContent = readProjectFile("docs/deployment.md");
  const operationsContent = readProjectFile("docs/operations.md");
  const productionEvidenceContent = readProjectFile("docs/production-security-evidence.md");
  const credentialManagementContent = readProjectFile("docs/credential-management.md");
  const publicBetaLaunchContent = readProjectFile("docs/public-beta-launch.md");
  const emlParserAdrContent = readProjectFile("docs/adr/0001-eml-parser.md");
  const apiAccessMigration = readProjectFile(
    "supabase/migrations/20260711120000_create_api_access.sql",
  );
  const quotaRefundMigration = readProjectFile(
    "supabase/migrations/20260711180000_refund_api_quota.sql",
  );
  const apiQuotaFixMigration = readProjectFile(
    "supabase/migrations/20260714071000_fix_consume_api_quota.sql",
  );
  const apiLifecycleMigration = readProjectFile(
    "supabase/migrations/20260714183000_harden_api_key_lifecycle.sql",
  );
  const apiMfaMigration = readProjectFile(
    "supabase/migrations/20260715120000_require_mfa_for_api_key_metadata.sql",
  );
  const hostedApiRoute = readProjectFile("src/app/api/v1/analyze/route.ts");
  const accountApiKeysRoute = readProjectFile("src/app/account/api-keys/route.ts");
  const operatorConfig = readProjectFile("src/lib/operator.ts");
  const clientIdentifier = readProjectFile("src/lib/security/client-identifier.ts");
  const scanLimits = readProjectFile("src/lib/scan-limits.ts");
  const ocrExtractor = readProjectFile("src/lib/ocr/extract-text.ts");
  const emlParser = readProjectFile("src/lib/eml/parse-eml.ts");
  const extensionManifest = readProjectFile("integrations/browser-extension/manifest.json");
  const extensionPanel = readProjectFile("integrations/browser-extension/sidepanel.js");
  const ciWorkflow = readProjectFile(".github/workflows/ci.yml");
  const releaseWorkflow = readProjectFile(".github/workflows/release.yml");
  const deployScript = readProjectFile("scripts/deploy-production.sh");

  assert.match(routeContent, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(routeContent, /console\./);
  assert.doesNotMatch(routeContent, /node:fs|writeFile|appendFile|createWriteStream/);
  assert.doesNotMatch(routeContent, /supabase|feedback\/storage/);
  assert.match(routeContent, /readBoundedRequestBody\(request, getAnalysisMaxRequestBytes\(\)\)/);
  assert.match(feedbackRouteContent, /"Cache-Control": "no-store"/);
  assert.doesNotMatch(feedbackRouteContent, /console\./);
  assert.match(
    feedbackRouteContent,
    /readBoundedRequestBody\(request, MAX_FEEDBACK_PAYLOAD_BYTES\)/,
  );
  assert.match(feedbackMigration, /enable row level security/i);
  assert.match(feedbackMigration, /purge_expired_detection_feedback/);
  assert.match(authCallbackContent, /getSafeOAuthRedirectUrl/);
  assert.match(authRedirectContent, /decodeURIComponent\(candidate\)/);
  assert.match(authRedirectContent, /UNSAFE_REDIRECT_CHARACTERS/);
  assert.match(authRedirectContent, /destination\.origin === fallbackUrl\.origin/);
  assert.match(authCallbackContent, /private, no-cache, no-store/);
  assert.match(authCallbackContent, /if \(!areAccountsEnabled\(\)\)/);
  assert.ok(
    authCallbackContent.indexOf("if (!areAccountsEnabled())") <
      authCallbackContent.indexOf("exchangeCodeForSession"),
    "the anonymous beta must reject OAuth callbacks before exchanging a session code",
  );
  assert.match(authCallbackContent, /hasOAuthErrorReturn\(requestUrl\)/);
  assert.match(middlewareContent, /hasOAuthErrorReturn\(request\.nextUrl\)/);
  assert.match(oauthReturnContent, /OAUTH_PROVIDER_FAILURE_CODE = "oauth_provider_failed"/);
  assert.doesNotMatch(oauthReturnContent, /searchParams\.get\("error_description"\)/);
  assert.match(accountDeletionContent, /getUser\(\)/);
  assert.match(accountDeletionContent, /admin\.auth\.admin\.deleteUser/);
  assert.match(accountDeletionContent, /verifyAccountDeletionToken/);
  assert.match(accountPageContent, /type="hidden" name="csrf" value=\{deletionToken/);
  assert.match(accountDeletionTokenContent, /createAccountMutationToken\("delete"/);
  assert.match(accountMutationTokenContent, /createHmac\("sha256", secret\)/);
  assert.match(accountMutationTokenContent, /timingSafeEqual/);
  assert.match(accountMutationTokenContent, /\$\{action\}/);
  assert.match(accountPageContent, /mutationToken=\{languageToken/);
  assert.match(accountPageContent, /name="csrf" value=\{signOutToken/);
  assert.match(accountLanguageContent, /isAuthorizedAccountMutation\(\{\s*action: "language"/);
  assert.match(accountDeletionContent, /ACCOUNT_DELETE_MAX_REQUEST_BYTES/);
  assert.match(accountDeletionContent, /hasRecentAuthentication\(data\.user\.last_sign_in_at\)/);
  assert.match(accountDeletionContent, /private, no-cache, no-store/);
  assert.match(accountDeletionContent, /if \(!areAccountsEnabled\(\)\)/);
  assert.ok(
    accountDeletionContent.indexOf("if (!areAccountsEnabled())") <
      accountDeletionContent.indexOf("const rawBody = await readBoundedRequestBody"),
    "the anonymous beta must reject deletion before reading its request body",
  );
  assert.match(accountLanguageContent, /if \(!areAccountsEnabled\(\)\)/);
  assert.ok(
    accountLanguageContent.indexOf("if (!areAccountsEnabled())") <
      accountLanguageContent.indexOf("const body = await readBoundedRequestBody"),
    "the anonymous beta must reject language changes before reading their request body",
  );
  assert.match(accountConfig, /env\.ACCOUNTS_ENABLED === "true"/);
  assert.match(accountApiKeysRoute, /if \(!areAccountsEnabled\(\)\) return disabledResponse\(\);/g);
  assert.ok(
    hostedApiRoute.indexOf("if (!areAccountsEnabled())") < hostedApiRoute.indexOf("getBearerToken"),
    "the anonymous beta must reject hosted API calls before reading credentials or request content",
  );
  assert.match(middlewareContent, /if \(!areAccountsEnabled\(\)\) \{\s*return response;/);
  assert.match(operatorConfig, /getPublicBetaOperatorProfile/);
  assert.match(operatorConfig, /Public-beta operator configuration is incomplete/);
  assert.match(clientIdentifier, /cf-connecting-ip/);
  assert.match(clientIdentifier, /environment\.NODE_ENV === "production"/);
  assert.doesNotMatch(clientIdentifier, /x-forwarded-for[\s\S]*cf-connecting-ip/);
  assert.ok(
    accountDeletionContent.indexOf("getUser()") <
      accountDeletionContent.indexOf("admin.auth.admin.deleteUser"),
    "account deletion must verify the signed-in user before using the admin API",
  );
  assert.match(signOutRouteContent, /getPublicAppOrigin/);
  assert.match(signOutRouteContent, /isStrictSameOriginMutation\(request, publicOrigin\)/);
  assert.match(signOutRouteContent, /Cross-origin sign-out is not allowed/);
  assert.match(signOutRouteContent, /isAuthorizedAccountMutation\(\{\s*action: "sign-out"/);
  assert.match(signOutRouteContent, /const \{ error: signOutError \} = await supabase\.auth\.signOut/);
  assert.ok(
    signOutRouteContent.indexOf("isStrictSameOriginMutation(request, publicOrigin)") <
      signOutRouteContent.indexOf("auth.signOut"),
    "sign-out must reject a cross-origin request before clearing the session",
  );
  for (const notificationType of [
    "password_changed",
    "email_changed",
    "phone_changed",
    "mfa_factor_enrolled",
    "mfa_factor_unenrolled",
    "identity_linked",
    "identity_unlinked",
  ]) {
    assert.match(supabaseConfig, new RegExp(`\\[auth\\.email\\.notification\\.${notificationType}\\]`));
  }
  assert.doesNotMatch(supabaseConfig, /auth\.email\.notification\.mfa_(?:enrolled|unenrolled)/);
  assert.doesNotMatch(
    supabaseConfig,
    /content_path\s*=/,
    "local Supabase startup must not depend on CLI-specific email template path resolution",
  );
  assert.match(
    supabaseConfig,
    /\[auth\.email\.template\.confirmation\][\s\S]*subject = '\{\{ if eq \.Data\.locale "nl" \}\}/,
    "confirmation email subjects must follow the account locale metadata",
  );
  for (const templateFile of readdirSync(join(PROJECT_ROOT, "supabase", "templates"))) {
    const template = readProjectFile(`supabase/templates/${templateFile}`);
    assert.match(
      template,
      /\.Data\.locale/,
      `${templateFile} must select copy from the account locale metadata`,
    );
    assert.doesNotMatch(
      template,
      />\s*\{\{ \.ConfirmationURL \}\}\s*</,
      `${templateFile} must not display the raw authentication URL`,
    );
  }
  assert.doesNotMatch(scannerPageContent, /\bredirect\s*\(/);
  assert.match(accountRequestGuard, /const candidateValue = origin \|\| referer/);
  assert.match(accountRequestGuard, /if \(!candidateValue\) return false/);
  assert.match(accountRequestGuard, /\(origin && \(/);
  assert.match(accountRequestGuard, /fetchSite === "same-origin"/);
  assert.match(accountRequestGuard, /totalBytes > maxBytes/);
  assert.match(accountRequestGuard, /RECENT_AUTH_MAX_AGE_MS = 15 \* 60 \* 1000/);

  for (const forbiddenColumn of [
    "body",
    "subject",
    "sender_email",
    "message_text",
    "links",
    "attachments",
    "free_text",
    "ip_address",
  ]) {
    assert.doesNotMatch(
      feedbackMigration,
      new RegExp(`^\\s*${forbiddenColumn}\\s+`, "im"),
      `feedback storage must not define ${forbiddenColumn}`,
    );
  }
  assert.match(nextConfigContent, /X-Content-Type-Options/);
  assert.match(nextConfigContent, /X-Frame-Options/);
  assert.match(nextConfigContent, /source: "\/\(\.\*\)"/);
  assert.match(nextConfigContent, /frame-ancestors 'none'/);
  assert.match(nextConfigContent, /default-src 'self'/);
  assert.match(nextConfigContent, /object-src 'none'/);
  assert.match(nextConfigContent, /getCspConnectSources\(process\.env\.NEXT_PUBLIC_SUPABASE_URL\)/);
  assert.match(nextConfigContent, /connect-src \$\{connectSources\.join\(" "\)\}/);
  assert.match(cspConfig, /url\.origin/);
  assert.match(cspConfig, /url\.protocol === "https:" \? "wss:" : "ws:"/);
  assert.doesNotMatch(cspConfig, /supabase\.co|connect-src \*/);
  assert.match(nextConfigContent, /worker-src 'self' blob:/);
  assert.match(nextConfigContent, /upgrade-insecure-requests/);
  assert.doesNotMatch(nextConfigContent, /office\.com|outlook\.com/);
  assert.match(nextConfigContent, /Referrer-Policy/);
  assert.match(nextConfigContent, /Permissions-Policy/);
  assert.match(nextConfigContent, /output: "standalone"/);
  assert.match(nextConfigContent, /poweredByHeader: false/);
  assert.match(dockerfileContent, /USER nextjs/);
  assert.match(dockerfileContent, /rm -rf \/usr\/local\/lib\/node_modules\/npm/);
  assert.match(dockerfileContent, /# syntax=docker\/dockerfile:1\.7@sha256:[0-9a-f]{64}/);
  assert.equal((dockerfileContent.match(/FROM node:22-alpine@sha256:[0-9a-f]{64}/g) ?? []).length, 3);
  assert.doesNotMatch(composeContent, /^\s*ports:/m);
  assert.match(composeContent, /read_only: true/);
  assert.match(composeContent, /no-new-privileges:true/);
  assert.match(composeContent, /max-size: 10m/);
  assert.match(deploymentContent, /Tunnel token only in `\/opt\/maillume\/\.env\.infrastructure`/);
  assert.doesNotMatch(
    deploymentContent,
    /Tunnel token only in `\/opt\/maillume\/\.env\.production`/,
  );
  assert.match(apiAccessMigration, /enable row level security/gi);
  assert.match(apiAccessMigration, /secret_hash char\(64\)/);
  assert.match(apiAccessMigration, /consume_api_quota/);
  assert.match(apiAccessMigration, /purge_expired_api_usage/);
  assert.match(apiQuotaFixMigration, /on conflict on constraint api_usage_monthly_pkey/);
  assert.doesNotMatch(apiQuotaFixMigration, /on conflict \(api_key_id,/);
  assert.match(quotaRefundMigration, /greatest\(0, request_count - 1\)/);
  assert.match(hostedApiRoute, /refund_account_api_quota/);
  assert.match(apiLifecycleMigration, /create table public\.api_account_limits/);
  assert.match(apiLifecycleMigration, /create table public\.api_account_usage_monthly/);
  assert.match(apiLifecycleMigration, /create table public\.api_quota_reservations/);
  assert.match(apiLifecycleMigration, /expires_at timestamptz/);
  assert.match(apiLifecycleMigration, /foreign key \(user_id, rotated_from_id\)[\s\S]*references public\.api_keys\(user_id, id\)/);
  assert.match(apiLifecycleMigration, /for update/g);
  const reserveQuotaFunction = apiLifecycleMigration.match(
    /create function public\.reserve_account_api_quota[\s\S]*?(?=create function public\.refund_account_api_quota)/,
  )?.[0] ?? "";
  assert.ok(
    reserveQuotaFunction.indexOf("from public.api_account_limits limits") <
      reserveQuotaFunction.indexOf("and keys.secret_hash = p_secret_hash\n  for update"),
    "quota reservation must lock the account before the API key",
  );
  assert.match(apiLifecycleMigration, /sum\(usage\.request_count\)::bigint/);
  assert.doesNotMatch(apiLifecycleMigration, /least\([^)]*usage\.request_count/);
  assert.match(apiLifecycleMigration, />= 5/);
  assert.match(apiLifecycleMigration, />= 10/);
  assert.match(apiLifecycleMigration, /create_hosted_api_key/);
  assert.match(apiLifecycleMigration, /rotate_hosted_api_key/);
  assert.match(apiLifecycleMigration, /revoke_hosted_api_key/);
  assert.match(apiLifecycleMigration, /grant select \([\s\S]*expires_at[\s\S]*\) on public\.api_keys to authenticated/);
  const publicKeyGrant = apiLifecycleMigration.match(
    /grant select \(([\s\S]*?)\) on public\.api_keys to authenticated/,
  )?.[1] ?? "";
  assert.doesNotMatch(publicKeyGrant, /secret_hash/);
  assert.match(apiLifecycleMigration, /set search_path = ''/);
  assert.match(apiLifecycleMigration, /grant execute on function public\.reserve_account_api_quota\(text\) to service_role/);
  assert.match(apiLifecycleMigration, /grant execute on function public\.refund_account_api_quota\(uuid\) to service_role/);
  assert.match(apiLifecycleMigration, /grant execute on function public\.finalize_account_api_quota\(uuid\) to service_role/);
  assert.match(apiLifecycleMigration, /reserved_at < clock_timestamp\(\) - interval '10 minutes'/);
  assert.match(apiLifecycleMigration, /revoke all on table public\.api_keys from authenticated, service_role/);
  assert.match(apiLifecycleMigration, /revoke all on table public\.api_account_limits from public, anon, authenticated, service_role/);
  assert.match(apiLifecycleMigration, /on delete cascade/);
  assert.doesNotMatch(apiLifecycleMigration, /^\s*(body|subject|sender_email|message_text|links|result|ip_address)\s+/im);
  assert.equal((apiMfaMigration.match(/auth\.jwt\(\) ->> 'aal'\) = 'aal2'/g) ?? []).length, 3);
  assert.match(accountApiKeysRoute, /hasAal2Session/);
  assert.match(accountApiKeysRoute, /create_hosted_api_key/);
  assert.match(accountApiKeysRoute, /rotate_hosted_api_key/);
  assert.match(accountApiKeysRoute, /revoke_hosted_api_key/);
  assert.match(accountApiKeysRoute, /ACCOUNT_API_KEY_MAX_REQUEST_BYTES/);
  assert.equal(
    (accountApiKeysRoute.match(/isStrictSameOriginMutation\(request\)/g) ?? []).length,
    3,
  );
  assert.doesNotMatch(accountApiKeysRoute, /\.insert\(|\.update\(/);
  assert.doesNotMatch(hostedApiRoute, /\.eq\("secret_hash"/);
  assert.doesNotMatch(apiAccessMigration, /^\s*(body|subject|sender_email|message_text|links|result|ip_address)\s+/im);
  assert.doesNotMatch(hostedApiRoute, /console\.|writeFile|appendFile|createWriteStream/);
  assert.match(hostedApiRoute, /hashApiKey\(token\)/);
  assert.match(hostedApiRoute, /reserve_account_api_quota/);
  assert.match(hostedApiRoute, /finalize_account_api_quota/);
  assert.match(hostedApiRoute, /reservation_id/);
  assert.match(hostedApiRoute, /readBoundedRequestBody\(request, getAnalysisMaxRequestBytes\(\)\)/);
  assert.doesNotMatch(hostedApiRoute, /consume_api_quota|inspect_api_key_status/);
  assert.match(extensionManifest, /"activeTab"/);
  assert.match(extensionManifest, /"minimum_chrome_version": "116"/);
  assert.doesNotMatch(extensionManifest, /"content_scripts"|"tabs"|mail\.google\.com|outlook\.office\.com/);
  assert.doesNotMatch(extensionPanel, /storage\.local\.set\([^)]*(?:body|result)[\s\S]*?\)/);
  assert.match(extensionPanel, /storage\.session\.set\(\{ apiKey \}\)/);
  assert.doesNotMatch(extensionPanel, /storage\.local\.set\(\{ apiKey \}\)/);
  assertPinnedActions(ciWorkflow, ".github/workflows/ci.yml");
  assertPinnedActions(releaseWorkflow, ".github/workflows/release.yml");
  assert.doesNotMatch(ciWorkflow, /push:\s*\n\s*branches:/);
  assert.match(ciWorkflow, /fetch-depth: 0/);
  assert.match(ciWorkflow, /gitleaks\/gitleaks-action@[0-9a-f]{40}/);
  assert.equal((ciWorkflow.match(/pull-requests: read/g) ?? []).length, 1);
  assert.match(releaseWorkflow, /fetch-depth: 0/);
  assert.match(releaseWorkflow, /needs: \[verify, secrets\]/);
  assert.match(releaseWorkflow, /name: Resolve verified image/);
  assert.match(releaseWorkflow, /IMAGE_TAG: ghcr\.io\/matthiasbusscher\/maillume:sha-\$\{\{ github\.sha \}\}/);
  assert.match(releaseWorkflow, /needs: resolve/);
  assert.match(releaseWorkflow, /needs\.resolve\.outputs\.image/);
  assert.match(releaseWorkflow, /npm run test:extension/);
  assert.match(releaseWorkflow, /image:\s*\$\{\{ steps\.digest\.outputs\.image \}\}/);
  assert.equal((releaseWorkflow.match(/packages: write/g) ?? []).length, 1);
  assert.equal((releaseWorkflow.match(/attestations: write/g) ?? []).length, 1);
  assert.equal((releaseWorkflow.match(/id-token: write/g) ?? []).length, 1);
  assert.match(releaseWorkflow, /ignore-unfixed: false/);
  assert.match(releaseWorkflow, /format: cyclonedx/);
  assert.match(releaseWorkflow, /name: maillume-image-sbom/);
  assert.match(
    releaseWorkflow,
    /actions\/attest-build-provenance@[0-9a-f]{40}/,
  );
  assert.match(releaseWorkflow, /subject-name: ghcr\.io\/matthiasbusscher\/maillume/);
  assert.match(releaseWorkflow, /subject-digest: \$\{\{ steps\.digest\.outputs\.digest \}\}/);
  assert.match(releaseWorkflow, /github\.event\.repository\.visibility == 'public'/);
  assert.match(
    operationsContent,
    /MAILLUME_IMAGE="\$previous" docker compose[\s\S]*--env-file \.env\.production[\s\S]*--env-file \.env\.infrastructure/,
    "manual rollback must load both production and infrastructure configuration",
  );
  assert.match(operationsContent, /maillume-image-sbom/);
  assert.match(operationsContent, /build\s+provenance attestation/);
  assert.match(deploymentContent, /\*\*Block\*\* action and an HTTP `429` response/);
  assert.match(productionEvidenceContent, /maillume-retention-check-20260718/);
  assert.match(productionEvidenceContent, /CF-Connecting-IP/);
  assert.match(productionEvidenceContent, /maillume-image-sbom/);
  assert.match(productionEvidenceContent, /time-bounded risk\s+acceptance/);
  assert.match(credentialManagementContent, /private password manager/);
  assert.match(credentialManagementContent, /CLOUDFLARE_TUNNEL_TOKEN/);
  assert.match(credentialManagementContent, /Supabase server secret/);
  assert.match(publicBetaLaunchContent, /\*\*Block\*\* action with an HTTP\s+`429` response/);
  assert.doesNotMatch(publicBetaLaunchContent, /and a Managed Challenge/);
  assert.match(emlParserAdrContent, /Status: Accepted \(temporary\)/);
  assert.match(emlParserAdrContent, /Review deadline: 2026-10-18/);
  assert.match(emlParserAdrContent, /postal-mime/);
  assert.match(emlParserAdrContent, /raw file entirely in browser memory/);
  assert.match(emlParserAdrContent, /Matthias Busscher/);
  assert.match(releaseWorkflow, /environment: production/);
  assert.match(releaseWorkflow, /github\.ref == 'refs\/heads\/main'/);
  assert.match(releaseWorkflow, /repository_digest="\$IMAGE_NAME@\$digest"/);
  assert.match(composeContent, /MAILLUME_IMAGE:\?Set MAILLUME_IMAGE to an immutable GHCR digest/);
  assert.match(composeContent, /CLOUDFLARED_IMAGE:-cloudflare\/cloudflared@sha256:[0-9a-f]{64}/);
  assert.doesNotMatch(composeContent, /cloudflare\/cloudflared:(?:latest|[\w.-]+)(?!@sha256)/);
  assert.match(deployScript, /--env-file "\$production_env"/);
  assert.match(deployScript, /--env-file "\$infrastructure_env"/);
  assert.match(deployScript, /MAILLUME_IMAGE="\$previous_image"/);
  assert.match(deployScript, /wait_for_health "\$previous_revision"/);
  assert.match(deployScript, /Rollback failed health checks; manual recovery is required/);
  assert.match(scanLimits, /MAX_SCREENSHOT_PIXELS = 20_000_000/);
  assert.match(scanLimits, /MAX_SCREENSHOT_DIMENSION = 8_000/);
  assert.match(scanLimits, /hasSupportedScreenshotSignature/);
  assert.match(scanLimits, /isWithinScreenshotDimensionLimit/);
  assert.match(ocrExtractor, /OCR_TIMEOUT_MS = 45_000/);
  assert.match(ocrExtractor, /createWorker\("eng\+nld"/);
  assert.match(ocrExtractor, /workerPath: "\/ocr\/worker\.min\.js"/);
  assert.match(ocrExtractor, /corePath: "\/ocr\/core"/);
  assert.match(ocrExtractor, /langPath: "\/ocr\/lang"/);
  assert.match(ocrExtractor, /worker\.terminate\(\)/);
  assert.match(emlParser, /MAX_EML_MULTIPART_SECTIONS = 64/);
  assert.match(emlParser, /MAX_EML_ATTACHMENT_NAMES = 25/);
  assert.match(emlParser, /MAX_EML_LINKS = 20/);
  assert.match(licenseContent, /GNU AFFERO GENERAL PUBLIC LICENSE/);
  assert.match(licenseContent, /13\. Remote Network Interaction/);
  assert.equal(packageMetadata.license, "AGPL-3.0-only");

  const analyzeResponseType = getAnalyzeResponseType();

  for (const rawInputField of ["body", "subject", "senderEmail"]) {
    assert.equal(
      analyzeResponseType.includes(rawInputField),
      false,
      `AnalyzeResponse should not include raw input field ${rawInputField}`,
    );
  }

  console.log("Checked privacy and secret-exposure guardrails.");
}

main();

function listSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const fullPath = join(directory, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      return listSourceFiles(fullPath);
    }

    if (!/\.(ts|tsx)$/.test(fullPath)) {
      return [];
    }

    return [fullPath];
  });
}

function isClientComponent(file: string): boolean {
  return readFileSync(file, "utf8").startsWith('"use client";');
}

function readProjectFile(path: string): string {
  return readFileSync(join(PROJECT_ROOT, path), "utf8");
}

function getAnalyzeResponseType(): string {
  const typesContent = readProjectFile("src/lib/types.ts");
  const start = typesContent.indexOf("export type AnalyzeResponse");
  const end = typesContent.indexOf("export type AnalyzeErrorResponse");

  assert.notEqual(start, -1, "AnalyzeResponse type should exist");
  assert.notEqual(end, -1, "AnalyzeErrorResponse type should exist");

  return typesContent.slice(start, end);
}

function assertPinnedActions(workflow: string, label: string) {
  const actionReferences = [...workflow.matchAll(/uses:\s*([^\s#]+)/g)].map(
    (match) => match[1],
  );
  assert.ok(actionReferences.length > 0, `${label} should contain actions`);

  for (const actionReference of actionReferences) {
    assert.match(
      actionReference,
      /^[^@\s]+@[0-9a-f]{40}$/,
      `${label} must pin ${actionReference} to a full commit SHA`,
    );
  }
}
