import 'package:flutter_test/flutter_test.dart';
import 'package:frontend/main.dart';
import 'package:shared_preferences/shared_preferences.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  setUp(() async {
    SharedPreferences.setMockInitialValues({});
    await ApiConfig.reset();
  });

  test(
    'fresh installation uses the production backend unless explicitly defined',
    () async {
      const configured = String.fromEnvironment(
        'API_BASE_URL',
        defaultValue: ApiConfig.hostedBaseUrl,
      );

      await ApiConfig.load();

      expect(ApiConfig.baseUrl, ApiConfig.normalize(configured));
    },
  );

  test(
    'saved custom backend survives reload and reset restores build default',
    () async {
      await ApiConfig.save(' https://attendance.example.test/ ');
      await ApiConfig.load();

      expect(ApiConfig.baseUrl, 'https://attendance.example.test/api');

      await ApiConfig.reset();
      await ApiConfig.load();

      expect(ApiConfig.baseUrl, ApiConfig.resolvedDefaultBaseUrl);
    },
  );

  test('retired hosted endpoints migrate to the configured backend', () async {
    SharedPreferences.setMockInitialValues({
      'api_base_url_v3': ApiConfig.retiredHostedBaseUrls.first,
      'api_base_url_v2': ApiConfig.retiredHostedBaseUrls.last,
    });

    await ApiConfig.load();

    expect(ApiConfig.baseUrl, ApiConfig.resolvedDefaultBaseUrl);
    final preferences = await SharedPreferences.getInstance();
    expect(preferences.getString('api_base_url_v4'), ApiConfig.resolvedDefaultBaseUrl);
    expect(preferences.containsKey('api_base_url_v3'), isFalse);
    expect(preferences.containsKey('api_base_url_v2'), isFalse);
  });

  test('saved custom backend migrates to the current preference key', () async {
    SharedPreferences.setMockInitialValues({
      'api_base_url_v3': 'https://attendance.example.test/api',
    });

    await ApiConfig.load();

    expect(ApiConfig.baseUrl, 'https://attendance.example.test/api');
    final preferences = await SharedPreferences.getInstance();
    expect(
      preferences.getString('api_base_url_v4'),
      'https://attendance.example.test/api',
    );
    expect(preferences.containsKey('api_base_url_v3'), isFalse);
  });

  test(
    'default build leaves Firebase push disabled without platform setup',
    () async {
      const enabled = bool.fromEnvironment('ENABLE_FIREBASE_PUSH');
      expect(PushMessagingService.enabled, enabled);

      if (!enabled) {
        await PushMessagingService.ensureFirebaseInitialized();
        await PushMessagingService.initialize();
        expect(PushMessagingService.isAvailable, isFalse);
        expect(await PushMessagingService.currentToken(), isNull);
      }
    },
  );
}
