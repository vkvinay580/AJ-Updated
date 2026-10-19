import 'package:aryan_verification/main.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  testWidgets('shows the Aryan Verification TE login', (tester) async {
    SharedPreferences.setMockInitialValues({});
    await tester.pumpWidget(const AryanVerificationApp());
    await tester.pumpAndSettle();
    expect(find.text('Aryan Verification'), findsOneWidget);
    expect(find.text('TE user ID'), findsOneWidget);
    expect(find.text('Sign in'), findsOneWidget);
  });
}
