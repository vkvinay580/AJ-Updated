import 'package:aryan_verification/main.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows the Aryan Verification TE login', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(
      AryanVerificationApp(updateChecker: () async => null),
    );
    await tester.pumpAndSettle();
    expect(find.text('Aryan Verification'), findsOneWidget);
    expect(find.text('TE user ID'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });

  testWidgets('blocks an outdated build until it is updated', (tester) async {
    SharedPreferences.setMockInitialValues({});
    const policy = AppUpdatePolicy(
      currentVersionName: '1.2.0',
      currentVersionCode: 4,
      latestVersionName: '1.2.1',
      latestVersionCode: 5,
      minimumVersionCode: 5,
      downloadUrl: 'https://aryangold.in/downloads/aryan-verification.apk',
      message: 'A new Aryan Verification update is required to continue.',
    );
    await tester.pumpWidget(
      AryanVerificationApp(updateChecker: () async => policy),
    );
    await tester.pumpAndSettle();
    expect(find.text('Update required'), findsOneWidget);
    expect(find.text('Download latest update'), findsOneWidget);
    expect(find.text('Sign in'), findsNothing);
  });
}
