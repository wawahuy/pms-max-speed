package com.giayuh_hdr;

import android.app.Application;
import android.content.Context;
import android.content.SharedPreferences;
import android.preference.PreferenceManager;

import com.facebook.react.PackageList;
import com.facebook.react.ReactApplication;
import com.facebook.react.ReactInstanceManager;
import com.facebook.react.ReactNativeHost;
import com.facebook.react.ReactPackage;
import com.facebook.soloader.SoLoader;

import java.lang.reflect.InvocationTargetException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

public class MainApplication extends Application implements ReactApplication {
  private final static String PREF_APP_KEY[] = {"pref_vpn_disallowed_application", "pref_vpn_allowed_application"};
  private final static String PREF_VPN_MODE = "pref_vpn_connection_mode";

  private static MainApplication instance;

  public static MainApplication getInstance() {
    return instance;
  }

  private final ReactNativeHost mReactNativeHost =
      new ReactNativeHost(this) {
        @Override
        public boolean getUseDeveloperSupport() {
          return BuildConfig.DEBUG;
        }

        @Override
        protected List<ReactPackage> getPackages() {
          @SuppressWarnings("UnnecessaryLocalVariable")
          List<ReactPackage> packages = new PackageList(this).getPackages();
          packages.add(new ZayuhPackage());
          return packages;
        }

        @Override
        protected String getJSMainModuleName() {
          return "index";
        }
      };

  @Override
  public ReactNativeHost getReactNativeHost() {
    return mReactNativeHost;
  }

  @Override
  public void onCreate() {
    super.onCreate();
    SoLoader.init(this, /* native exopackage */ false);
    initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
    instance = this;
  }

  /**
   * Loads Flipper in React Native templates. Call this in the onCreate method with something like
   * initializeFlipper(this, getReactNativeHost().getReactInstanceManager());
   *
   * @param context
   * @param reactInstanceManager
   */
  private static void initializeFlipper(
      Context context, ReactInstanceManager reactInstanceManager) {
    if (BuildConfig.DEBUG) {
      try {
        /*
         We use reflection here to pick up the class that initializes Flipper,
        since Flipper library is not available in release mode
        */
        Class<?> aClass = Class.forName("com.giayuh_hdr.ReactNativeFlipper");
        aClass
            .getMethod("initializeFlipper", Context.class, ReactInstanceManager.class)
            .invoke(null, context, reactInstanceManager);
      } catch (ClassNotFoundException e) {
        e.printStackTrace();
      } catch (NoSuchMethodException e) {
        e.printStackTrace();
      } catch (IllegalAccessException e) {
        e.printStackTrace();
      } catch (InvocationTargetException e) {
        e.printStackTrace();
      }
    }
  }

  public enum VPNMode {DISALLOW, ALLOW};
  public VPNMode loadVPNMode() {
    final SharedPreferences sharedPreferences = PreferenceManager.getDefaultSharedPreferences(getApplicationContext());
    final String vpn_mode = sharedPreferences.getString(PREF_VPN_MODE, MainApplication.VPNMode.DISALLOW.name());
    return VPNMode.valueOf(vpn_mode);
  }

  public void storeVPNMode(VPNMode mode) {
    final SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(getApplicationContext());
    final SharedPreferences.Editor editor = prefs.edit();
    editor.putString(PREF_VPN_MODE, mode.name()).apply();
    return;
  }

  public Set<String> loadVPNApplication(VPNMode mode) {
    final SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(getApplicationContext());
    final Set<String> preference = prefs.getStringSet(PREF_APP_KEY[mode.ordinal()], new HashSet<String>());
    return preference;
  }

  public void storeVPNApplication(VPNMode mode, final Set<String> set) {
    final SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(getApplicationContext());
    final SharedPreferences.Editor editor = prefs.edit();
    editor.putStringSet(PREF_APP_KEY[mode.ordinal()], set).apply();
    return;
  }
}
