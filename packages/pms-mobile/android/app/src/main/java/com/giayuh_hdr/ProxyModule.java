package com.giayuh_hdr;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.content.ServiceConnection;
import android.content.SharedPreferences;
import android.net.VpnService;
import android.os.Handler;
import android.os.IBinder;
import android.preference.PreferenceManager;
import android.widget.Toast;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;

import com.facebook.react.bridge.ActivityEventListener;
import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.Callback;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;
import com.giayuh_hdr.service.Tun2HttpVpnService;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

import static android.app.Activity.RESULT_OK;

public class ProxyModule extends ReactContextBaseJavaModule implements LifecycleEventListener, ActivityEventListener {
    public static final int REQUEST_VPN = 1;
    public static final int REQUEST_CERT = 2;
    private ReactApplicationContext reactContext;
    private Tun2HttpVpnService service;
    private String host;
    private int port;
    private String pkg;
    private boolean isRunningOld = false;

    Handler statusHandler;

    public ProxyModule(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.reactContext.addLifecycleEventListener(this);
        this.reactContext.addActivityEventListener(this);
    }

    public boolean isRunning() {
        return service != null && service.isRunning();
    }

    @NonNull
    @Override
    public String getName() {
        return "ProxyModule";
    }

    @Nullable
    @Override
    public Map<String, Object> getConstants() {
        Map<String, Object> constants = new HashMap<>();
        return constants;
    }

    private ServiceConnection serviceConnection = new ServiceConnection() {
        public void onServiceConnected(ComponentName className, IBinder binder) {
            Tun2HttpVpnService.ServiceBinder serviceBinder = (Tun2HttpVpnService.ServiceBinder) binder;
            service = serviceBinder.getService();
        }
        public void onServiceDisconnected(ComponentName className) {
            service = null;
        }
    };

    Runnable statusRunnable = new Runnable() {
        @Override
        public void run() {
            updateStatus();
            statusHandler.post(statusRunnable);
        }
    };

    @ReactMethod
    private void stopVpn() {
        Tun2HttpVpnService.stop(this.reactContext);
    }

    @ReactMethod
    private void startVpn(String host, int port, String pkg) {
        this.host = host;
        this.port = port;
        this.pkg = pkg;
        Intent i = VpnService.prepare(this.reactContext);
        if (i != null) {
            this.reactContext.startActivityForResult(i, REQUEST_VPN, null);
        } else {
            onActivityResult(null, REQUEST_VPN, RESULT_OK, null);
        }
    }

    @Override
    public void onHostResume() {
        updateStatus();
        if (statusHandler == null) {
            this.reactContext.runOnUiQueueThread(() -> {
                statusHandler = new Handler();
            });
        }
        this.reactContext.runOnUiQueueThread(() -> {
            this.isRunningOld = false;
            statusHandler.post(statusRunnable);
        });
        Intent intent = new Intent(this.reactContext, Tun2HttpVpnService.class);
        this.reactContext.bindService(intent, serviceConnection, Context.BIND_AUTO_CREATE);
    }

    @Override
    public void onHostPause() {
        this.reactContext.runOnUiQueueThread(() -> {
            statusHandler.removeCallbacks(statusRunnable);
        });
        this.reactContext.unbindService(serviceConnection);
    }

    @Override
    public void onHostDestroy() {

    }

    @Override
    public void onActivityResult(Activity activity, int requestCode, int resultCode, Intent data) {
        if (resultCode != RESULT_OK) {
            return;
        }
        if (requestCode == REQUEST_VPN) {
            loadHostPort();
            loadFilterPackage();
            updateStatus();
            Tun2HttpVpnService.start(reactContext);
        }
    }

    @Override
    public void onNewIntent(Intent intent) {
    }

    private void loadHostPort() {
        SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(this.reactContext);
        SharedPreferences.Editor edit = prefs.edit();
        edit.putString(Tun2HttpVpnService.PREF_PROXY_HOST, this.host);
        edit.putInt(Tun2HttpVpnService.PREF_PROXY_PORT, this.port);
        edit.commit();
    }

    private void loadFilterPackage() {
        MainApplication.getInstance().storeVPNMode(MainApplication.VPNMode.ALLOW);
        Set<String> list = new HashSet<String>();
        list.add(pkg);
        MainApplication.getInstance().storeVPNApplication(MainApplication.VPNMode.ALLOW, list);
    }

    private void sendEvent(@Nullable WritableMap params) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
            .emit("vpn_event", params);
    }

    private void updateStatus() {
        if (service == null) {
            return;
        }
        if (isRunning() != isRunningOld) {
            this.isRunningOld = isRunning();
            WritableMap params = Arguments.createMap();
            params.putBoolean("status", this.isRunningOld);
            sendEvent(params);
        }
    }
}
