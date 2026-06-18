import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.liryk",
  appName: "Liryk",
  webDir: "dist",
  android: {
    path: "android",
    allowMixedContent: false,
  },
  server: {
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
