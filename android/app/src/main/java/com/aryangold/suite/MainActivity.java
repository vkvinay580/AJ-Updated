package com.aryangold.suite;

import android.Manifest;
import android.app.Activity;
import android.app.AlertDialog;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.print.PrintAttributes;
import android.print.PrintManager;
import android.view.View;
import android.webkit.*;
import android.widget.*;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import org.json.JSONObject;
import java.io.*;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

public class MainActivity extends Activity {
    private static final int PICK_FILE = 10, MEDIA_PERMISSION = 11, SAVE_FILE = 12;
    private final ExecutorService worker = Executors.newSingleThreadExecutor();
    private WebView web;
    private LinearLayout root;
    private ProgressBar progress;
    private String origin;
    private ValueCallback<Uri[]> fileCallback;
    private PermissionRequest mediaRequest;
    private String[] pendingWebResources;
    private File pendingSave;
    private boolean exporting;
    private boolean loadFailed;
    private TextView errorView;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(Color.rgb(250, 248, 242));
        root.setOnApplyWindowInsetsListener((view, insets) -> {
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets;
        });
        setContentView(root);
        root.requestApplyInsets();
        clearOldExports();
        origin = ServerPolicy.normalize(BuildConfig.WEBSITE_URL, BuildConfig.DEBUG);
        showWebsite();
        if (android.os.Build.VERSION.SDK_INT >= 33) {
            getOnBackInvokedDispatcher().registerOnBackInvokedCallback(0, this::navigateBack);
        }
    }

    private void showWebsite() {
        root.removeAllViews();
        progress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        root.addView(progress, new LinearLayout.LayoutParams(-1, 4));
        errorView = new TextView(this); errorView.setPadding(24, 24, 24, 24);
        errorView.setVisibility(View.GONE); root.addView(errorView);
        errorView.setOnClickListener(v -> web.reload());
        web = new WebView(this);
        web.setImportantForAutofill(View.IMPORTANT_FOR_AUTOFILL_NO_EXCLUDE_DESCENDANTS);
        root.addView(web, new LinearLayout.LayoutParams(-1, 0, 1));
        WebSettings settings = web.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_NO_CACHE);
        settings.setSupportMultipleWindows(true);
        settings.setUserAgentString(settings.getUserAgentString() + " AryanGoldAndroid/" + BuildConfig.VERSION_NAME);
        CookieManager.getInstance().setAcceptCookie(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web, false);
        // Login fields can contain locally restored passwords, including in the distributable test APK.
        WebView.setWebContentsDebuggingEnabled(false);
        if (WebViewFeature.isFeatureSupported(WebViewFeature.WEB_MESSAGE_LISTENER)) {
            WebViewCompat.addWebMessageListener(web, "AryanAndroid", Collections.singleton(origin),
                (view, message, source, mainFrame, reply) -> {
                    if (!mainFrame || !ServerPolicy.sameOrigin(origin, source.toString())) return;
                    try {
                        JSONObject request = new JSONObject(message.getData());
                        String action = request.getString("action");
                        if (action.startsWith("credentials")) {
                            JSONObject result = new JSONObject().put("requestId", request.optString("requestId"));
                            // Credentials may only cross the bridge on the trusted top-level HTTPS login page.
                            if (!origin.startsWith("https://") || !ServerPolicy.sameOrigin(origin, web.getUrl())
                                || !"/admin/login".equals(Uri.parse(web.getUrl()).getPath())) {
                                reply.postMessage(result.put("error", "Saved login is only available on the sign-in page.").toString());
                                return;
                            }
                            try {
                                CredentialStore saved = new CredentialStore(MainActivity.this, origin);
                                if (action.equals("credentialsRead")) {
                                    JSONObject credentials = saved.read();
                                    result.put("credentials", credentials == null ? JSONObject.NULL : credentials);
                                } else if (action.equals("credentialsSave")) {
                                    saved.save(request.getString("email"), request.getString("password"), request.getString("company"));
                                } else if (action.equals("credentialsClear")) saved.clear();
                                else throw new IllegalArgumentException("Unsupported credential action.");
                                reply.postMessage(result.put("ok", true).toString());
                            } catch (Exception error) {
                                reply.postMessage(result.put("error", "Could not update the saved login on this device.").toString());
                            }
                        } else if (action.equals("print")) {
                            PrintManager manager = (PrintManager) getSystemService(PRINT_SERVICE);
                            manager.print("Aryan Gold invoice", web.createPrintDocumentAdapter("Aryan Gold invoice"),
                                new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
                        } else if (action.equals("save") || action.equals("share")) {
                            export(request.getString("url"), action, request.optString("filename", "document.pdf"),
                                request.optString("text", ""));
                        }
                    } catch (Exception error) { toast("Unable to complete the action. Try again."); }
                });
        } else toast("Update Android System WebView to enable saving, sharing and printing.");
        web.setWebViewClient(new WebViewClient() {
            @Override public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                if (!request.isForMainFrame()) return !ServerPolicy.sameOrigin(origin, request.getUrl().toString());
                return navigate(request.getUrl());
            }
            @Override public void onPageStarted(WebView view, String url, android.graphics.Bitmap icon) {
                loadFailed = false; errorView.setVisibility(View.GONE); progress.setVisibility(View.VISIBLE);
                if (mediaRequest != null) { mediaRequest.deny(); mediaRequest = null; pendingWebResources = null; }
            }
            @Override public void onPageFinished(WebView view, String url) {
                progress.setVisibility(View.GONE); CookieManager.getInstance().flush();
                if (loadFailed) errorView.setVisibility(View.VISIBLE);
            }
            @Override public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
                if (request.isForMainFrame()) showLoadError();
            }
            @Override public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse response) {
                if (request.isForMainFrame() && response.getStatusCode() >= 500) showLoadError();
            }
            @Override public void onReceivedSslError(WebView view, android.webkit.SslErrorHandler handler, android.net.http.SslError error) {
                handler.cancel(); showLoadError();
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override public void onProgressChanged(WebView view, int value) { progress.setProgress(value); }
            @Override public boolean onJsAlert(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("OK", (d, w) -> result.confirm())
                    .setOnCancelListener(d -> result.cancel()).show(); return true;
            }
            @Override public boolean onJsConfirm(WebView view, String url, String message, JsResult result) {
                new AlertDialog.Builder(MainActivity.this).setMessage(message).setPositiveButton("Confirm", (d, w) -> result.confirm())
                    .setNegativeButton("Cancel", (d, w) -> result.cancel()).setOnCancelListener(d -> result.cancel()).show(); return true;
            }
            @Override public boolean onShowFileChooser(WebView view, ValueCallback<Uri[]> callback, FileChooserParams params) {
                if (!ServerPolicy.sameOrigin(origin, view.getUrl())) return false;
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = callback;
                try { startActivityForResult(params.createIntent(), PICK_FILE); }
                catch (Exception error) { fileCallback.onReceiveValue(null); fileCallback = null; toast("No file picker is available."); }
                return true;
            }
            @Override public void onPermissionRequest(PermissionRequest request) {
                if (!ServerPolicy.sameOrigin(origin, request.getOrigin().toString()) || !ServerPolicy.sameOrigin(origin, web.getUrl())) {
                    request.deny(); return;
                }
                java.util.List<String> requested = java.util.Arrays.asList(request.getResources());
                java.util.List<String> webResources = new java.util.ArrayList<>();
                java.util.List<String> androidPermissions = new java.util.ArrayList<>();
                if (requested.contains(PermissionRequest.RESOURCE_VIDEO_CAPTURE)) {
                    webResources.add(PermissionRequest.RESOURCE_VIDEO_CAPTURE);
                    if (checkSelfPermission(Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED)
                        androidPermissions.add(Manifest.permission.CAMERA);
                }
                if (requested.contains(PermissionRequest.RESOURCE_AUDIO_CAPTURE)) {
                    webResources.add(PermissionRequest.RESOURCE_AUDIO_CAPTURE);
                    if (checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED)
                        androidPermissions.add(Manifest.permission.RECORD_AUDIO);
                }
                if (webResources.isEmpty() || webResources.size() != requested.size()) { request.deny(); return; }
                if (mediaRequest != null) mediaRequest.deny();
                mediaRequest = request;
                pendingWebResources = webResources.toArray(new String[0]);
                if (androidPermissions.isEmpty()) {
                    request.grant(pendingWebResources); mediaRequest = null; pendingWebResources = null;
                } else requestPermissions(androidPermissions.toArray(new String[0]), MEDIA_PERMISSION);
            }
            @Override public void onPermissionRequestCanceled(PermissionRequest request) {
                if (mediaRequest == request) { mediaRequest = null; pendingWebResources = null; }
            }
            @Override public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, android.os.Message message) {
                if (!userGesture) return false;
                WebView popup = new WebView(MainActivity.this);
                popup.setWebViewClient(new WebViewClient() {
                    @Override public boolean shouldOverrideUrlLoading(WebView child, WebResourceRequest request) {
                        if (!navigate(request.getUrl())) web.loadUrl(request.getUrl().toString());
                        child.destroy(); return true;
                    }
                });
                ((WebView.WebViewTransport) message.obj).setWebView(popup); message.sendToTarget(); return true;
            }
        });
        web.setDownloadListener((url, agent, disposition, mime, length) -> {
            if (ServerPolicy.exportAllowed(origin, url)) export(url, "save", URLUtil.guessFileName(url, disposition, mime), "");
            else toast("This download is not supported. Update the website Android integration.");
        });
        web.loadUrl(origin + "/admin");
    }

    private boolean navigate(Uri uri) {
        String url = uri.toString();
        if (ServerPolicy.sameOrigin(origin, url)) {
            if ("/downloads/aryan-gold.apk".equals(uri.getPath())) {
                try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
                catch (Exception error) { toast("Open the website in your browser to download the app."); }
                return true;
            }
            if (ServerPolicy.exportAllowed(origin, url)) {
                export(url, "save", "document.pdf", ""); return true;
            }
            return false;
        }
        String scheme = uri.getScheme();
        if ("https".equals(scheme) || "http".equals(scheme) || "tel".equals(scheme) || "mailto".equals(scheme)) {
            try { startActivity(new Intent(Intent.ACTION_VIEW, uri).addCategory(Intent.CATEGORY_BROWSABLE)); }
            catch (Exception error) { toast("No app can open this link."); }
        }
        return true;
    }

    private void showLoadError() {
        loadFailed = true;
        errorView.setText("Cannot connect to " + origin + ". Check your connection and tap this message to retry. If a save was interrupted, check the register before submitting again.");
        errorView.setVisibility(View.VISIBLE); progress.setVisibility(View.GONE);
    }

    private void export(String url, String action, String filename, String text) {
        if (!ServerPolicy.exportAllowed(origin, url)) { toast("This file address is not allowed."); return; }
        if (exporting || pendingSave != null) { toast("Finish the current file operation first."); return; }
        exporting = true;
        String cookie = CookieManager.getInstance().getCookie(url);
        toast("Preparing file…");
        worker.execute(() -> {
            HttpURLConnection connection = null;
            File file = null;
            try {
                connection = (HttpURLConnection) new URL(url).openConnection();
                connection.setInstanceFollowRedirects(false);
                connection.setConnectTimeout(20000); connection.setReadTimeout(60000);
                if (cookie != null) connection.setRequestProperty("Cookie", cookie);
                int status = connection.getResponseCode();
                if (status == 401 || status == 403) throw new IOException("Your session expired. Sign in again.");
                if (status != 200) throw new IOException("Unable to download the file. Please try again.");
                String mime = connection.getContentType();
                if (mime == null) throw new IOException("The server did not return a document.");
                mime = mime.split(";")[0];
                if (!(mime.equals("application/pdf") || mime.equals("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
                    || mime.equals("image/jpeg") || mime.equals("image/png") || mime.equals("image/webp")))
                    throw new IOException("The server did not return a supported document.");
                String disposition = connection.getHeaderField("Content-Disposition");
                String name = disposition == null ? filename : URLUtil.guessFileName(url, disposition, mime);
                name = name.replaceAll("[^a-zA-Z0-9._-]", "_");
                if (name.isEmpty() || name.equals(".") || name.equals("..")) name = "document.pdf";
                if (name.length() > 150) name = name.substring(name.length() - 150);
                File directory = new File(getCacheDir(), "exports/" + java.util.UUID.randomUUID());
                if (!directory.mkdirs()) throw new IOException("Cannot prepare file storage.");
                file = new File(directory, name);
                try (InputStream input = connection.getInputStream(); OutputStream output = new FileOutputStream(file)) {
                    byte[] buffer = new byte[16384]; int count; long total = 0;
                    while ((count = input.read(buffer)) != -1) {
                        total += count;
                        if (total > 100L * 1024 * 1024) throw new IOException("File exceeds the 100 MB app download limit.");
                        output.write(buffer, 0, count);
                    }
                }
                File ready = file; String contentType = mime;
                runOnUiThread(() -> {
                    exporting = false;
                    if (isFinishing() || isDestroyed()) { ready.delete(); return; }
                    try {
                        if (action.equals("share")) {
                            Uri uri = FileProvider.getUriForFile(this, getPackageName() + ".files", ready);
                            Intent intent = new Intent(Intent.ACTION_SEND).setType(contentType)
                                .putExtra(Intent.EXTRA_STREAM, uri).putExtra(Intent.EXTRA_TEXT, text)
                                .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            intent.setClipData(ClipData.newRawUri("Document", uri));
                            startActivity(Intent.createChooser(intent, "Share bill"));
                        } else {
                            pendingSave = ready;
                            startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).setType(contentType)
                                .addCategory(Intent.CATEGORY_OPENABLE).putExtra(Intent.EXTRA_TITLE, ready.getName()), SAVE_FILE);
                        }
                    } catch (Exception error) { pendingSave = null; ready.delete(); toast("No app is available for this file operation."); }
                });
            } catch (Exception error) {
                if (file != null) file.delete();
                runOnUiThread(() -> { exporting = false; toast(error.getMessage() == null ? "Download failed." : error.getMessage()); });
            } finally { if (connection != null) connection.disconnect(); }
        });
    }

    @Override protected void onActivityResult(int code, int result, Intent data) {
        super.onActivityResult(code, result, data);
        if (code == PICK_FILE && fileCallback != null) {
            fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data)); fileCallback = null;
        }
        if (code == SAVE_FILE && pendingSave != null) {
            File source = pendingSave; pendingSave = null;
            if (result != RESULT_OK || data == null || data.getData() == null) { source.delete(); return; }
            Uri target = data.getData();
            worker.execute(() -> {
                try (InputStream input = new FileInputStream(source); OutputStream output = getContentResolver().openOutputStream(target, "wt")) {
                    if (output == null) throw new IOException("Cannot open destination.");
                    byte[] buffer = new byte[16384]; int count;
                    while ((count = input.read(buffer)) != -1) output.write(buffer, 0, count);
                    runOnUiThread(() -> toast("File saved."));
                } catch (Exception error) { runOnUiThread(() -> toast("Could not save the file. Please try again.")); }
                finally { source.delete(); }
            });
        }
    }

    @Override public void onRequestPermissionsResult(int code, String[] permissions, int[] results) {
        super.onRequestPermissionsResult(code, permissions, results);
        if (code == MEDIA_PERMISSION && mediaRequest != null) {
            boolean granted = results.length > 0;
            for (int result : results) if (result != PackageManager.PERMISSION_GRANTED) granted = false;
            if (granted && pendingWebResources != null && web != null && ServerPolicy.sameOrigin(origin, web.getUrl()))
                mediaRequest.grant(pendingWebResources);
            else mediaRequest.deny();
            mediaRequest = null; pendingWebResources = null;
        }
    }

    private void toast(String message) { Toast.makeText(this, message, Toast.LENGTH_LONG).show(); }
    private void navigateBack() { if (web != null && web.canGoBack()) web.goBack(); else finish(); }
    // API 33+ uses the OnBackInvokedDispatcher registered in onCreate; this is the API 26-32 fallback.
    @android.annotation.SuppressLint("GestureBackNavigation")
    @Override public void onBackPressed() { navigateBack(); }
    @Override protected void onPause() {
        if (web != null) web.onPause(); CookieManager.getInstance().flush(); super.onPause();
    }
    @Override protected void onResume() { super.onResume(); if (web != null) web.onResume(); }
    @Override protected void onDestroy() {
        if (fileCallback != null) fileCallback.onReceiveValue(null);
        if (mediaRequest != null) mediaRequest.deny();
        if (pendingSave != null) pendingSave.delete();
        if (web != null) web.destroy(); worker.shutdown(); super.onDestroy();
    }
    private void clearOldExports() {
        File[] directories = new File(getCacheDir(), "exports").listFiles();
        if (directories == null) return;
        for (File directory : directories) {
            File[] files = directory.listFiles();
            if (files == null) continue;
            for (File file : files) if (file.lastModified() < System.currentTimeMillis() - 86400000L) file.delete();
            directory.delete();
        }
    }
}
