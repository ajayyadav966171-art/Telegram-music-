import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as NativeApp } from '@capacitor/app';

export const initCapacitor = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      // Configure Status Bar for Edge-to-Edge Dark theme
      await StatusBar.setStyle({ style: Style.Dark });
      if (Capacitor.getPlatform() === 'android') {
        await StatusBar.setBackgroundColor({ color: '#020617' });
        await StatusBar.setOverlaysWebView({ overlay: false });
      }
    } catch (e) {
      console.warn('StatusBar plugin initialization:', e);
    }

    try {
      // Hide splash screen after initialization
      await SplashScreen.hide();
    } catch (e) {
      console.warn('SplashScreen plugin initialization:', e);
    }

    try {
      // Handle Android hardware back button
      NativeApp.addListener('backButton', ({ canGoBack }) => {
        if (!canGoBack) {
          NativeApp.minimizeApp();
        } else {
          window.history.back();
        }
      });
    } catch (e) {
      console.warn('App plugin initialization:', e);
    }
  }
};
