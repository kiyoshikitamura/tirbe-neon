import {
  getExternalBrowserUrl,
  getAndroidChromeIntentUrl,
  getGameUrlFromEntry,
  getMobilePlatform,
  getOAuthCallbackUrl,
  getOAuthReturnUrl,
  isXInAppBrowser,
} from "../src/utils/browserDetection.ts";

const assertions = [
  ["X iOS", isXInAppBrowser("Mozilla/5.0 Twitter for iPhone/10.50") === true],
  ["X Android", isXInAppBrowser("Mozilla/5.0 TwitterAndroid/10.50") === true],
  ["Safari", isXInAppBrowser("Mozilla/5.0 Version/18.0 Mobile Safari/604.1") === false],
  ["Chrome", isXInAppBrowser("Mozilla/5.0 Chrome/131.0 Mobile Safari/537.36") === false],
  ["iOS platform", getMobilePlatform("Mozilla/5.0 (iPhone) Twitter for iPhone/10.50") === "ios"],
  ["Android platform", getMobilePlatform("Mozilla/5.0 (Linux; Android 15) TwitterAndroid/10.50") === "android"],
  ["external invite", getExternalBrowserUrl("https://example.com/?invite=ABC").endsWith("/?invite=ABC")],
  ["external token stripping", !getExternalBrowserUrl("https://example.com/?invite=ABC&access_token=secret").includes("secret")],
  ["callback invite", getOAuthCallbackUrl("https://example.com/?invite=ABC") === "https://example.com/auth/callback?invite=ABC"],
  ["return invite", getOAuthReturnUrl("https://example.com/auth/callback?invite=ABC&code=oauth-code") === "https://example.com/?invite=ABC"],
  ["entry parameters", getGameUrlFromEntry("https://example.com/open?invite=ABC&utm_source=x") === "https://example.com/?invite=ABC&utm_source=x"],
  ["Android intent", getAndroidChromeIntentUrl("https://example.com/?invite=ABC").startsWith("intent://example.com/?invite=ABC#Intent;scheme=https;package=com.android.chrome;")],
];

const failures = assertions.filter(([, passed]) => !passed).map(([name]) => name);
if (failures.length) throw new Error(`Browser detection verification failed: ${failures.join(", ")}`);
console.log(`Browser detection verification PASS (${assertions.length}/${assertions.length})`);
