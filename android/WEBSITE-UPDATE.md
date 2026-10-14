# Website update for the Android app

This update is for the existing https://aryangold.in Next.js application.

1. Back up the existing files being replaced by this archive.
2. Extract the archive into the cPanel **Node.js application root**, preserving
   the `app`, `components`, `lib`, and `public` directories. Do not extract the
   whole archive into `public`.
3. In the application's Node.js environment run `npm run build`.
4. Restart the Node.js application through cPanel.
5. Install the Android APK and sign in using the existing company/account.

Do not replace `.env` settings, reset the database, rerun setup, or change
`DATA_ENCRYPTION_KEY`. This update has no database schema changes.

The update connects existing print, save, report export, and bill-share buttons
to native Android actions. Other browsers retain their existing behavior.
It also permits multiple concurrent sessions for the same administrator so the
website and app can stay logged in together. Password changes still revoke
other sessions; logout affects only the current device.

The admin sidebar includes **Download Android app**, served from
`public/downloads/aryan-gold.apk`. This is currently the debug/testing APK.
The download URL is public; app access still requires an existing administrator
login. Replace this file with your signed release APK when ready for distribution.

Version 1.2.0 keeps the Home/Reload/Server toolbar removed and uses the actual website
favicon as the application icon. Install this newer APK over the previous app.
Deploy the login-page and bridge updates in this ZIP as well as the new APK.
**Save password in this app** stores the successful login in encrypted private
Android storage and fills it when returning to login. No password manager or
autofill settings link is used. Sign in once with the option checked to save;
uncheck it on login to erase the remembered entry. Existing sessions still reopen
automatically. Saved credentials remain on logout and are removed on uninstall
or clearing app data.

After deploying, test with a test customer/bill: camera upload, PDF save/share,
report exports, printing, and simultaneous website/app login. Refresh the other
device's register to see saved changes. An open page does not receive push updates.
