package com.aryangold.suite;

import android.app.Instrumentation;
import android.content.Intent;
import android.webkit.WebView;
import androidx.test.platform.app.InstrumentationRegistry;
import org.json.JSONObject;
import org.junit.Test;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import static org.junit.Assert.*;

/** Exercises real WebView messages against a synthetic origin; never touches production credentials. */
public class CredentialBridgeTest {
    private static final String ORIGIN = "https://bridge-test.invalid";
    private final Instrumentation instrumentation = InstrumentationRegistry.getInstrumentation();
    private WebView web;

    private String evaluate(String script) throws Exception {
        CountDownLatch complete = new CountDownLatch(1);
        AtomicReference<String> value = new AtomicReference<>();
        instrumentation.runOnMainSync(() -> web.evaluateJavascript(script, result -> { value.set(result); complete.countDown(); }));
        assertTrue("WebView evaluation timed out", complete.await(10, TimeUnit.SECONDS));
        return value.get();
    }

    private void load(String path) throws Exception {
        instrumentation.runOnMainSync(() -> web.loadDataWithBaseURL(ORIGIN + path,
            "<html><body><input id='email'><input id='password' type='password'><script>window.fixtureReady=true</script></body></html>",
            "text/html", "UTF-8", ORIGIN + path));
        for (int i = 0; i < 100; i++) {
            if ("true".equals(evaluate("window.fixtureReady===true && typeof AryanAndroid==='object' && location.pathname===" + JSONObject.quote(path)))) return;
            Thread.sleep(100);
        }
        fail("Fixture did not load");
    }

    private JSONObject request(JSONObject request) throws Exception {
        request.put("requestId", "test-request");
        evaluate("window.testReply=null;AryanAndroid.onmessage=e=>{window.testReply=JSON.parse(e.data)};AryanAndroid.postMessage(" + JSONObject.quote(request.toString()) + ")");
        for (int i = 0; i < 100; i++) {
            String value = evaluate("window.testReply");
            if (value != null && !value.equals("null")) return new JSONObject(value);
            Thread.sleep(100);
        }
        throw new AssertionError("Credential bridge timed out");
    }

    @Test public void saveRestoreClearAndRejectNonLoginPage() throws Exception {
        CredentialStore store = new CredentialStore(instrumentation.getTargetContext(), ORIGIN); store.clear();
        MainActivity activity = (MainActivity) instrumentation.startActivitySync(new Intent(instrumentation.getTargetContext(), MainActivity.class)
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
        try {
            instrumentation.runOnMainSync(() -> {
                try {
                    java.lang.reflect.Field field = MainActivity.class.getDeclaredField("web"); field.setAccessible(true);
                    ((WebView) field.get(activity)).destroy();
                    java.lang.reflect.Field origin = MainActivity.class.getDeclaredField("origin"); origin.setAccessible(true); origin.set(activity, ORIGIN);
                    java.lang.reflect.Method show = MainActivity.class.getDeclaredMethod("showWebsite"); show.setAccessible(true); show.invoke(activity);
                    web = (WebView) field.get(activity);
                } catch (Exception error) { throw new RuntimeException(error); }
            });
            load("/admin/login");
            JSONObject savedReply = request(new JSONObject().put("action", "credentialsSave").put("email", "bridge@example.invalid")
                .put("password", "Synthetic-bridge-only!").put("company", "aryan-gold"));
            assertTrue(savedReply.optString("error", "Missing acknowledgement"), savedReply.optBoolean("ok"));
            load("/admin/login");
            JSONObject saved = request(new JSONObject().put("action", "credentialsRead")).getJSONObject("credentials");
            assertEquals("bridge@example.invalid", saved.getString("email"));
            assertEquals("Synthetic-bridge-only!", saved.getString("password"));
            load("/admin");
            assertTrue(request(new JSONObject().put("action", "credentialsRead")).has("error"));
            load("/admin/login");
            assertTrue(request(new JSONObject().put("action", "credentialsClear")).getBoolean("ok"));
            assertTrue(request(new JSONObject().put("action", "credentialsRead")).isNull("credentials"));
        } finally {
            store.clear(); instrumentation.runOnMainSync(activity::finish);
        }
    }
}
