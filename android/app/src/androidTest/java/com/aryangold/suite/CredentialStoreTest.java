package com.aryangold.suite;

import androidx.test.platform.app.InstrumentationRegistry;
import android.content.Context;
import org.junit.After;
import org.junit.Before;
import org.junit.Test;
import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import static org.junit.Assert.*;

public class CredentialStoreTest {
    private static final String ORIGIN = "https://credential-test.invalid";
    private Context context;
    private CredentialStore store;
    @Before public void setup() throws Exception {
        context = InstrumentationRegistry.getInstrumentation().getTargetContext();
        store = new CredentialStore(context, ORIGIN); store.clear();
    }
    @After public void cleanup() throws Exception { store.clear(); }
    @Test public void persistsEncryptedCredentialsAcrossStoreInstances() throws Exception {
        store.save("test@example.invalid", "Synthetic-password-493!", "aryan-gold");
        CredentialStore reopened = new CredentialStore(context, ORIGIN);
        assertEquals("Synthetic-password-493!", reopened.read().getString("password"));
        assertEquals("test@example.invalid", reopened.read().getString("email"));
        assertEquals("aryan-gold", reopened.read().getString("company"));
        for (File file : context.getNoBackupFilesDir().listFiles()) {
            if (!file.getName().startsWith("aryan.remembered-login.")) continue;
            String bytes = new String(Files.readAllBytes(file.toPath()), StandardCharsets.UTF_8);
            assertFalse(bytes.contains("Synthetic-password-493!"));
            assertFalse(bytes.contains("test@example.invalid"));
        }
        assertNull(new CredentialStore(context, "https://different-test.invalid").read());
        store.clear(); assertNull(reopened.read());
    }
    @Test public void replacesPasswordAndRejectsInvalidInput() throws Exception {
        store.save("test@example.invalid", "first-password", "aryan-gold");
        store.save("test@example.invalid", "replacement-password", "aryan-jewels");
        assertEquals("replacement-password", store.read().getString("password"));
        try { store.save("", "", ""); fail("Invalid credentials accepted"); }
        catch (IllegalArgumentException expected) { /* Existing valid entry is retained. */ }
        assertEquals("replacement-password", store.read().getString("password"));
    }
    @Test public void corruptedStorageFallsBackToManualLogin() throws Exception {
        store.save("test@example.invalid", "synthetic-password", "aryan-gold");
        String suffix = android.util.Base64.encodeToString(java.security.MessageDigest.getInstance("SHA-256")
            .digest(ORIGIN.getBytes(StandardCharsets.UTF_8)), android.util.Base64.URL_SAFE | android.util.Base64.NO_WRAP | android.util.Base64.NO_PADDING);
        File encrypted = new File(context.getNoBackupFilesDir(), "aryan.remembered-login." + suffix);
        Files.write(encrypted.toPath(), "corrupted-data".getBytes(StandardCharsets.UTF_8));
        assertNull(store.read()); assertFalse(encrypted.exists());
        store.save("test@example.invalid", "new-password", "aryan-gold");
        assertEquals("new-password", store.read().getString("password"));
    }
}
