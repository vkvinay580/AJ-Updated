package com.aryangold.suite;

import android.content.Context;
import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;
import android.util.AtomicFile;
import android.util.Base64;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import java.security.MessageDigest;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;

/** One remembered account per website, encrypted with a non-exportable Android Keystore key. */
final class CredentialStore {
    private final AtomicFile file;
    private final String alias;
    private final byte[] associatedData;

    CredentialStore(Context context, String origin) throws Exception {
        associatedData = origin.getBytes(StandardCharsets.UTF_8);
        String suffix = Base64.encodeToString(MessageDigest.getInstance("SHA-256").digest(associatedData),
            Base64.URL_SAFE | Base64.NO_WRAP | Base64.NO_PADDING);
        alias = "aryan.remembered-login." + suffix;
        file = new AtomicFile(new File(context.getNoBackupFilesDir(), alias));
    }

    private KeyStore keyStore() throws Exception {
        KeyStore store = KeyStore.getInstance("AndroidKeyStore"); store.load(null); return store;
    }

    private SecretKey encryptionKey() throws Exception {
        KeyStore store = keyStore();
        if (store.containsAlias(alias)) return (SecretKey) store.getKey(alias, null);
        KeyGenerator generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        generator.init(new KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
            .setKeySize(256).setBlockModes(KeyProperties.BLOCK_MODE_GCM)
            .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return generator.generateKey();
    }

    void save(String email, String password, String company) throws Exception {
        if (email.isEmpty() || email.length() > 320 || password.isEmpty() || password.length() > 4096
            || !company.matches("[a-z0-9-]{1,80}")) throw new IllegalArgumentException("Invalid login details.");
        JSONObject credentials = new JSONObject().put("email", email).put("password", password).put("company", company);
        Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
        cipher.init(Cipher.ENCRYPT_MODE, encryptionKey()); cipher.updateAAD(associatedData);
        byte[] encrypted = cipher.doFinal(credentials.toString().getBytes(StandardCharsets.UTF_8));
        JSONObject envelope = new JSONObject().put("iv", Base64.encodeToString(cipher.getIV(), Base64.NO_WRAP))
            .put("ciphertext", Base64.encodeToString(encrypted, Base64.NO_WRAP));
        FileOutputStream output = file.startWrite();
        try { output.write(envelope.toString().getBytes(StandardCharsets.UTF_8)); file.finishWrite(output); }
        catch (Exception error) { file.failWrite(output); throw error; }
    }

    JSONObject read() throws Exception {
        if (!file.getBaseFile().exists()) return null;
        try {
            JSONObject envelope = new JSONObject(new String(file.readFully(), StandardCharsets.UTF_8));
            SecretKey key = (SecretKey) keyStore().getKey(alias, null);
            if (key == null) throw new IllegalStateException("Saved key unavailable.");
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, Base64.decode(envelope.getString("iv"), Base64.NO_WRAP)));
            cipher.updateAAD(associatedData);
            return new JSONObject(new String(cipher.doFinal(Base64.decode(envelope.getString("ciphertext"), Base64.NO_WRAP)), StandardCharsets.UTF_8));
        } catch (Exception error) {
            // A missing/invalid key or corrupted file must never prevent manual sign-in.
            clear(); return null;
        }
    }

    void clear() throws Exception {
        file.delete(); KeyStore store = keyStore();
        if (store.containsAlias(alias)) store.deleteEntry(alias);
    }
}
