package com.udaan.app;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.widget.TextView;
import android.widget.LinearLayout;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {

    private WebView webView;
    private TextView statusText;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setBackgroundColor(Color.WHITE);

        statusText = new TextView(this);
        statusText.setText("UDAAN: testing localhost...");
        statusText.setTextSize(17);
        statusText.setTextColor(Color.BLACK);
        statusText.setPadding(25, 25, 25, 25);

        webView = new WebView(this);

        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(
                WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
        );

        webView.setWebViewClient(new WebViewClient() {

            @Override
            public void onPageStarted(
                    WebView view,
                    String url,
                    android.graphics.Bitmap favicon
            ) {
                statusText.setText(
                        "WebView loading...\n" + url
                );
            }

            @Override
            public void onPageFinished(
                    WebView view,
                    String url
            ) {
                statusText.setText("");
            }

            @Override
            public void onReceivedError(
                    WebView view,
                    WebResourceRequest request,
                    WebResourceError error
            ) {
                if (request.isForMainFrame()) {
                    statusText.setText(
                            "WEBVIEW ERROR\n\n" +
                            "URL: " + request.getUrl() +
                            "\n\nERROR: " +
                            error.getDescription()
                    );
                }
            }
        });

        layout.addView(
                statusText,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT
                )
        );

        layout.addView(
                webView,
                new LinearLayout.LayoutParams(
                        LinearLayout.LayoutParams.MATCH_PARENT,
                        0,
                        1
                )
        );

        setContentView(layout);

        testLocalhost();
    }

    private void testLocalhost() {

        ExecutorService executor =
                Executors.newSingleThreadExecutor();

        executor.execute(() -> {

            String result;

            try {
                URL url =
                        new URL(
                                "http://127.0.0.1:3000/home.html"
                        );

                HttpURLConnection connection =
                        (HttpURLConnection) url.openConnection();

                connection.setConnectTimeout(5000);
                connection.setReadTimeout(5000);
                connection.setRequestMethod("GET");

                int code =
                        connection.getResponseCode();

                result =
                        "LOCALHOST TEST\n\n" +
                        "HTTP: " + code +
                        "\n\nWebView will load now.";

                connection.disconnect();

            } catch (Exception e) {

                result =
                        "LOCALHOST TEST FAILED\n\n" +
                        e.getClass().getSimpleName() +
                        "\n\n" +
                        e.getMessage();
            }

            final String finalResult = result; runOnUiThread(() -> {

                statusText.setText(finalResult);

                webView.loadUrl(
                        "http://127.0.0.1:3000/home.html"
                );
            });
        });
    }

    @Override
    public void onBackPressed() {

        if (webView != null &&
                webView.canGoBack()) {

            webView.goBack();

        } else {

            super.onBackPressed();
        }
    }
}
