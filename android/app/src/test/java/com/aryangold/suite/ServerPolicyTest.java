package com.aryangold.suite;

import org.junit.Test;
import static org.junit.Assert.*;

public class ServerPolicyTest {
    @Test public void productionRequiresHttpsOrigin() {
        assertEquals("https://aryangold.in", ServerPolicy.normalize(" https://aryangold.in/ ", false));
        for (String value : new String[]{"http://aryangold.in", "https://user:pass@aryangold.in", "https://aryangold.in/admin",
            "https://aryangold.in?site=other", "https://aryangold.in#x", "file:///tmp/a", "javascript:alert(1)", "https://aryangold.in:99999"}) {
            assertThrows(IllegalArgumentException.class, () -> ServerPolicy.normalize(value, false));
        }
        assertEquals("http://10.0.2.2:3000", ServerPolicy.normalize("http://10.0.2.2:3000", true));
    }
    @Test public void originComparisonRejectsLookalikesAndDowngrades() {
        String site = "https://aryangold.in";
        assertTrue(ServerPolicy.sameOrigin(site, "https://aryangold.in:443/admin"));
        for (String url : new String[]{"http://aryangold.in", "https://aryangold.in.evil.test", "https://evil.test@aryangold.in",
            "https://aryangold.in:444/admin", "https://other.test", "file:///tmp/a", "https://aryangold.in\\@evil.test"}) {
            assertFalse(url, ServerPolicy.sameOrigin(site, url));
        }
    }
    @Test public void nativeDownloadsOnlyAllowProtectedDocumentRoutes() {
        String site = "https://aryangold.in";
        assertTrue(ServerPolicy.exportAllowed(site, site + "/api/admin/bills/12/pdf"));
        assertTrue(ServerPolicy.exportAllowed(site, site + "/api/admin/reports?format=xlsx"));
        assertTrue(ServerPolicy.exportAllowed(site, site + "/api/admin/documents/3"));
        for (String path : new String[]{"/api/admin/logout", "/api/admin/bills", "/api/admin/bills/../pdf", "/api/admin/bills/%31/pdf",
            "/api/admin/reports/../login", "/api/admin/reports%2f..%2flogin"}) assertFalse(ServerPolicy.exportAllowed(site, site + path));
        assertFalse(ServerPolicy.exportAllowed(site, "https://evil.test/api/admin/bills/1/pdf"));
    }
}
