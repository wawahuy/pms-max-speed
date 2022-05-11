package com.giayuh_hdr.receiver;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.net.VpnService;
import android.preference.PreferenceManager;
import android.util.Log;

import com.giayuh_hdr.service.Tun2HttpVpnService;

public class BootReceiver extends BroadcastReceiver {

    @Override
    public void onReceive(final Context context, Intent intent) {
        if (intent != null && !Intent.ACTION_BOOT_COMPLETED.equals(intent.getAction())) {
            return;
        }

        final SharedPreferences prefs = PreferenceManager.getDefaultSharedPreferences(context);
        boolean isRunning = prefs.getBoolean(Tun2HttpVpnService.PREF_RUNNING, false);
        if (isRunning) {
            Intent prepare = VpnService.prepare(context);
            if (prepare == null) {
                Log.d(".Boot", "Starting vpn");
                Tun2HttpVpnService.start(context);
            } else {
                Log.d(".Boot", "Not prepared");
            }
        }
    }
}