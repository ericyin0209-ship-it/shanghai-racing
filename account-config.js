// PUBLIC configuration only. Never put OAuth client secrets or service-role keys here.
export const accountConfig = Object.freeze({
  supabaseUrl: '',
  publishableKey: '',
  emailEnabled: false,
  // Enable only after a successful end-to-end test on the published domain.
  providers: {
    wechat: {enabled: false, provider: 'custom:wechat'},
    qq: {enabled: false, provider: 'custom:qq'},
    google: {enabled: false, provider: 'google'},
    apple: {enabled: false, provider: 'apple'}
  }
});
