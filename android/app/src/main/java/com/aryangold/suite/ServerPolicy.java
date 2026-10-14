package com.aryangold.suite;

import java.net.URI;

/** Shared policy for setup, navigation, native permissions and authenticated downloads. */
final class ServerPolicy {
    static String normalize(String input, boolean debug) {
        URI uri = URI.create(input.trim());
        String scheme = uri.getScheme();
        if (!("https".equals(scheme) || (debug && "http".equals(scheme))))
            throw new IllegalArgumentException("Enter an HTTPS website address.");
        if (uri.getHost() == null || uri.getRawUserInfo() != null || uri.getRawQuery() != null
                || uri.getRawFragment() != null || (uri.getPort() != -1 && (uri.getPort() < 1 || uri.getPort() > 65535))
                || !(uri.getPath().isEmpty() || uri.getPath().equals("/")))
            throw new IllegalArgumentException("Enter only the website origin, without a page path or login details.");
        return scheme + "://" + uri.getRawAuthority().toLowerCase(java.util.Locale.ROOT);
    }

    static boolean sameOrigin(String origin, String candidate) {
        try {
            URI a = URI.create(origin), b = URI.create(candidate);
            return b.getRawUserInfo() == null && a.getScheme().equals(b.getScheme())
                && a.getHost().equalsIgnoreCase(b.getHost()) && port(a) == port(b);
        } catch (Exception ignored) { return false; }
    }

    private static int port(URI uri) {
        return uri.getPort() == -1 ? ("https".equals(uri.getScheme()) ? 443 : 80) : uri.getPort();
    }

    static boolean exportAllowed(String origin, String url) {
        if (!sameOrigin(origin, url)) return false;
        String path = URI.create(url).getRawPath();
        return path != null && (path.matches("/api/admin/bills/[0-9]+/pdf")
            || path.matches("/api/admin/documents/[0-9]+")
            || path.matches("/api/admin/bills/[0-9]+/media/(customer|item|signature)")
            || path.equals("/api/admin/reports"));
    }
}
