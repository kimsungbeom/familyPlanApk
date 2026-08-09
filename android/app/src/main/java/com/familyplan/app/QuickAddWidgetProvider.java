package com.familyplan.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Date;
import java.util.Locale;

public class QuickAddWidgetProvider extends AppWidgetProvider {

    private static final String PREFS_NAME = "com.familyplan.app.widget_prefs";
    private static final String ACTION_UPDATE_DATE = "com.familyplan.app.UPDATE_WIDGET_DATE";

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId);
        }
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        if (ACTION_UPDATE_DATE.equals(intent.getAction())) {
            int appWidgetId = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
            if (appWidgetId != AppWidgetManager.INVALID_APPWIDGET_ID) {
                String date = intent.getStringExtra("date");
                int direction = intent.getIntExtra("direction", 0);
                try {
                    SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
                    Date d = sdf.parse(date);
                    Calendar cal = Calendar.getInstance();
                    cal.setTime(d);
                    cal.add(Calendar.DAY_OF_MONTH, direction);
                    String newDate = sdf.format(cal.getTime());
                    SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
                    prefs.edit().putString("widget_date_" + appWidgetId, newDate).apply();
                    AppWidgetManager.getInstance(context).updateAppWidget(appWidgetId, buildRemoteViews(context, appWidgetId, newDate));
                } catch (Exception ignored) {}
            }
        }
    }

    @Override
    public void onDeleted(Context context, int[] appWidgetIds) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        SharedPreferences.Editor editor = prefs.edit();
        for (int id : appWidgetIds) {
            editor.remove("widget_date_" + id);
        }
        editor.apply();
    }

    private void updateWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = buildRemoteViews(context, appWidgetId, null);
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    private RemoteViews buildRemoteViews(Context context, int appWidgetId, String overrideDate) {
        SharedPreferences prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String date = overrideDate != null ? overrideDate : prefs.getString("widget_date_" + appWidgetId, getToday());
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_quick_add);
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);

        views.setTextViewText(R.id.widget_date, formatDateKorean(date));

        // Prev button
        Intent prevIntent = new Intent(context, QuickAddWidgetProvider.class);
        prevIntent.setAction(ACTION_UPDATE_DATE);
        prevIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        prevIntent.putExtra("date", date);
        prevIntent.putExtra("direction", -1);
        PendingIntent prevPending = PendingIntent.getBroadcast(context, appWidgetId * 10,
                prevIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_date_prev, prevPending);

        // Next button
        Intent nextIntent = new Intent(context, QuickAddWidgetProvider.class);
        nextIntent.setAction(ACTION_UPDATE_DATE);
        nextIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, appWidgetId);
        nextIntent.putExtra("date", date);
        nextIntent.putExtra("direction", 1);
        PendingIntent nextPending = PendingIntent.getBroadcast(context, appWidgetId * 10 + 1,
                nextIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_date_next, nextPending);

        // Submit button -> open app with extras
        Intent submitIntent = new Intent(context, MainActivity.class);
        submitIntent.setAction(Intent.ACTION_VIEW);
        submitIntent.putExtra("widget_action", "quick_add");
        submitIntent.putExtra("widget_date", date);
        submitIntent.putExtra("widget_member_index", 0);
        submitIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent submitPending = PendingIntent.getActivity(context, appWidgetId * 10 + 2,
                submitIntent, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        views.setOnClickPendingIntent(R.id.widget_submit, submitPending);

        return views;
    }

    private String getToday() {
        SimpleDateFormat sdf = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
        return sdf.format(new Date());
    }

    private String formatDateKorean(String ymd) {
        try {
            SimpleDateFormat in = new SimpleDateFormat("yyyy-MM-dd", Locale.US);
            SimpleDateFormat out = new SimpleDateFormat("M월 d일 (E)", Locale.KOREAN);
            return out.format(in.parse(ymd));
        } catch (Exception e) {
            return ymd;
        }
    }
}
