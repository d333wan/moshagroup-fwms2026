import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.moshagroup.fwms",
  appName: "FWMS Petugas",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
  plugins: {
    Camera: {
      // uses system camera; permissions declared via @capacitor/camera
    },
    Geolocation: {},
  },
};

export default config;
