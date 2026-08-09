package com.familyplan.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

import android.content.Intent;
import android.webkit.WebView;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        createNotificationChannel();
        handleWidgetIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleWidgetIntent(intent);
    }

    private void handleWidgetIntent(Intent intent) {
        if (intent == null || getBridge() == null) return;
        String action = intent.getStringExtra("widget_action");
        if (!"quick_add".equals(action)) return;
        String date = intent.getStringExtra("widget_date");
        if (date == null) return;
        WebView wv = (WebView) getBridge().getWebView();
        wv.post(() -> wv.evaluateJavascript(
            "localStorage.setItem('fp_widget','" + date + "')", null));
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                "familyplan",
                "FAMILY PLAN",
                NotificationManager.IMPORTANCE_HIGH
            );
            channel.setDescription("일정 알림");
            NotificationManager manager = getSystemService(NotificationManager.class);
            manager.createNotificationChannel(channel);
        }
    }
}
