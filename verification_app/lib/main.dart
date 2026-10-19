import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:ui';

import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:http/http.dart' as http;
import 'package:image_picker/image_picker.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:workmanager/workmanager.dart';
import 'package:video_compress/video_compress.dart';
import 'visit_video.dart';

const apiBase = String.fromEnvironment(
  'API_BASE',
  defaultValue: 'https://aryangold.in/api',
);
const firebaseApiKey = String.fromEnvironment('FIREBASE_API_KEY');
const firebaseAppId = String.fromEnvironment('FIREBASE_APP_ID');
const firebaseSenderId = String.fromEnvironment('FIREBASE_SENDER_ID');
const firebaseProjectId = String.fromEnvironment('FIREBASE_PROJECT_ID');
bool get firebaseConfigured =>
    firebaseApiKey.isNotEmpty &&
    firebaseAppId.isNotEmpty &&
    firebaseSenderId.isNotEmpty &&
    firebaseProjectId.isNotEmpty;
const verificationPollTask = 'aryan_verification_assignment_poll';
const verificationPollUniqueName = 'aryan_verification_assignment_periodic';
final localNotifications = FlutterLocalNotificationsPlugin();

Future<void> initializeLocalNotifications({
  bool requestPermission = false,
}) async {
  await localNotifications.initialize(
    settings: const InitializationSettings(
      android: AndroidInitializationSettings('@mipmap/ic_launcher'),
    ),
  );
  if (requestPermission) {
    await localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >()
        ?.requestNotificationsPermission();
  }
}

Future<bool> pollVerificationAssignments() async {
  try {
    final prefs = await SharedPreferences.getInstance();
    await prefs.reload();
    final token = prefs.getString('te_token');
    if (token == null || token.isEmpty) return true;
    final response = await http
        .get(
          Uri.parse('$apiBase/verification/requests'),
          headers: {
            'Authorization': 'Bearer $token',
            'Accept': 'application/json',
          },
        )
        .timeout(const Duration(seconds: 15));
    if (response.statusCode != 200) return true;
    final data = jsonDecode(response.body) as Map<String, dynamic>;
    final open = (data['requests'] as List<dynamic>? ?? [])
        .where(
          (item) => [
            'assigned',
            'in_progress',
          ].contains((item as Map<String, dynamic>)['status']?.toString()),
        )
        .cast<Map<String, dynamic>>()
        .toList();
    if (open.isEmpty) return true;
    final shownIds = prefs.getStringList('notified_request_ids') ?? [];
    for (final assignment in open) {
      final assignmentId = assignment['id'].toString();
      if (shownIds.contains(assignmentId)) continue;
      await prefs.reload();
      if (prefs.getString('te_token') != token) return true;
      await initializeLocalNotifications();
      await localNotifications.show(
        id: int.parse(assignmentId),
        title: 'New customer verification',
        body: '${assignment['customerName']} · ${assignment['branchName']}',
        notificationDetails: const NotificationDetails(
          android: AndroidNotificationDetails(
            'verification_assignments',
            'Verification assignments',
            channelDescription: 'New customer home-verification assignments',
            importance: Importance.max,
            priority: Priority.max,
          ),
        ),
      );
      shownIds.add(assignmentId);
      await prefs.setStringList(
        'notified_request_ids',
        shownIds.length > 500
            ? shownIds.sublist(shownIds.length - 500)
            : shownIds,
      );
    }
  } catch (_) {}
  return true;
}

@pragma('vm:entry-point')
void verificationBackgroundDispatcher() {
  Workmanager().executeTask((task, inputData) async {
    DartPluginRegistrant.ensureInitialized();
    return pollVerificationAssignments();
  });
}

Future<void> scheduleVerificationPolling() async {
  if (!Platform.isAndroid) return;
  await Workmanager().registerPeriodicTask(
    verificationPollUniqueName,
    verificationPollTask,
    frequency: const Duration(minutes: 15),
    constraints: Constraints(networkType: NetworkType.connected),
    existingWorkPolicy: ExistingPeriodicWorkPolicy.update,
  );
  await Workmanager().registerOneOffTask(
    '${verificationPollUniqueName}_now',
    verificationPollTask,
    constraints: Constraints(networkType: NetworkType.connected),
    existingWorkPolicy: ExistingWorkPolicy.replace,
  );
}

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  if (firebaseConfigured) {
    await Firebase.initializeApp(
      options: const FirebaseOptions(
        apiKey: firebaseApiKey,
        appId: firebaseAppId,
        messagingSenderId: firebaseSenderId,
        projectId: firebaseProjectId,
      ),
    );
  }
  await Workmanager().initialize(verificationBackgroundDispatcher);
  await initializeLocalNotifications(requestPermission: true);
  runApp(const AryanVerificationApp());
}

class AryanVerificationApp extends StatefulWidget {
  const AryanVerificationApp({super.key});
  @override
  State<AryanVerificationApp> createState() => _AryanVerificationAppState();
}

class _AryanVerificationAppState extends State<AryanVerificationApp> {
  String? token;
  Map<String, dynamic>? user;
  bool loading = true;

  @override
  void initState() {
    super.initState();
    _restore();
  }

  Future<void> _restore() async {
    final prefs = await SharedPreferences.getInstance();
    final savedUser = prefs.getString('te_user');
    if (!mounted) return;
    setState(() {
      token = prefs.getString('te_token');
      user = savedUser == null
          ? null
          : jsonDecode(savedUser) as Map<String, dynamic>;
      loading = false;
    });
    if (token != null) await scheduleVerificationPolling();
  }

  Future<void> signedIn(String nextToken, Map<String, dynamic> nextUser) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('te_token', nextToken);
    await prefs.setString('te_user', jsonEncode(nextUser));
    await scheduleVerificationPolling();
    if (mounted) {
      setState(() {
        token = nextToken;
        user = nextUser;
      });
    }
  }

  Future<void> signOut() async {
    if (token != null) {
      try {
        if (firebaseConfigured) {
          final deviceToken = await FirebaseMessaging.instance.getToken();
          if (deviceToken != null) {
            await Api(
              token!,
            ).delete('/verification/device', {'token': deviceToken});
          }
          await FirebaseMessaging.instance.deleteToken();
        }
        await Api(token!).delete('/verification/session');
      } catch (_) {}
    }
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('te_token');
    await prefs.remove('te_user');
    await prefs.remove('notified_request_ids');
    await localNotifications.cancelAll();
    if (Platform.isAndroid) {
      await Workmanager().cancelByUniqueName(verificationPollUniqueName);
      await Workmanager().cancelByUniqueName(
        '${verificationPollUniqueName}_now',
      );
    }
    if (mounted) {
      setState(() {
        token = null;
        user = null;
      });
    }
  }

  @override
  Widget build(BuildContext context) => MaterialApp(
    title: 'Aryan Verification',
    debugShowCheckedModeBanner: false,
    theme: ThemeData(
      colorScheme: ColorScheme.fromSeed(
        seedColor: const Color(0xff176354),
        primary: const Color(0xff176354),
        secondary: const Color(0xffb88622),
        surface: const Color(0xfffffdf8),
      ),
      scaffoldBackgroundColor: const Color(0xfff4f5f2),
      useMaterial3: true,
      inputDecorationTheme: const InputDecorationTheme(
        border: OutlineInputBorder(),
        filled: true,
        fillColor: Colors.white,
      ),
      cardTheme: const CardThemeData(
        color: Colors.white,
        elevation: 0,
        margin: EdgeInsets.zero,
      ),
    ),
    home: loading
        ? const SplashPage()
        : token == null
        ? LoginPage(onSignedIn: signedIn)
        : HomePage(token: token!, user: user ?? const {}, onSignOut: signOut),
  );
}

class Api {
  Api(this.token);
  final String token;
  Map<String, String> get headers => {
    'Authorization': 'Bearer $token',
    'Accept': 'application/json',
  };
  Future<http.Response> get(String path) =>
      http.get(Uri.parse('$apiBase$path'), headers: headers);
  Future<http.Response> post(String path, Map<String, dynamic> body) =>
      http.post(
        Uri.parse('$apiBase$path'),
        headers: {...headers, 'Content-Type': 'application/json'},
        body: jsonEncode(body),
      );
  Future<http.Response> delete(String path, [Map<String, dynamic>? body]) =>
      http.delete(
        Uri.parse('$apiBase$path'),
        headers: {...headers, 'Content-Type': 'application/json'},
        body: body == null ? null : jsonEncode(body),
      );
}

String responseMessage(http.Response response, String fallback) {
  try {
    final body = jsonDecode(response.body) as Map<String, dynamic>;
    return (body['error'] ?? body['message'] ?? fallback).toString();
  } catch (_) {
    return fallback;
  }
}

class SplashPage extends StatelessWidget {
  const SplashPage({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(
    body: Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          BrandMark(size: 82),
          SizedBox(height: 18),
          Text(
            'ARYAN VERIFICATION',
            style: TextStyle(fontWeight: FontWeight.w800),
          ),
          SizedBox(height: 22),
          CircularProgressIndicator(),
        ],
      ),
    ),
  );
}

class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 64});
  final double size;
  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      shape: BoxShape.circle,
      color: const Color(0xff123d35),
      border: Border.all(color: const Color(0xffd7aa47), width: 3),
    ),
    child: Icon(
      Icons.verified_user_outlined,
      color: const Color(0xffffd978),
      size: size * .54,
    ),
  );
}

class LoginPage extends StatefulWidget {
  const LoginPage({super.key, required this.onSignedIn});
  final Future<void> Function(String, Map<String, dynamic>) onSignedIn;
  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final userId = TextEditingController(), password = TextEditingController();
  bool obscure = true, saving = false;
  String error = '';

  Future<void> login() async {
    if (userId.text.trim().isEmpty || password.text.isEmpty) {
      setState(() => error = 'Enter your TE user ID and password.');
      return;
    }
    setState(() {
      saving = true;
      error = '';
    });
    try {
      final response = await http.post(
        Uri.parse('$apiBase/verification/login'),
        headers: const {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: jsonEncode({
          'userId': userId.text.trim(),
          'password': password.text,
        }),
      );
      if (response.statusCode != 200) {
        throw Exception(responseMessage(response, 'Unable to sign in.'));
      }
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      await widget.onSignedIn(
        data['token'].toString(),
        data['user'] as Map<String, dynamic>,
      );
    } catch (caught) {
      if (mounted) {
        setState(
          () => error = caught.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
    body: SafeArea(
      child: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 430),
            child: Card(
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(22),
              ),
              child: Padding(
                padding: const EdgeInsets.all(26),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Center(child: BrandMark(size: 76)),
                    const SizedBox(height: 18),
                    const Text(
                      'Aryan Verification',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 27,
                        fontWeight: FontWeight.w800,
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'Secure field-verification workspace for TE users',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey.shade600),
                    ),
                    const SizedBox(height: 28),
                    TextField(
                      controller: userId,
                      textInputAction: TextInputAction.next,
                      autocorrect: false,
                      decoration: const InputDecoration(
                        labelText: 'TE user ID',
                        prefixIcon: Icon(Icons.badge_outlined),
                      ),
                    ),
                    const SizedBox(height: 14),
                    TextField(
                      controller: password,
                      obscureText: obscure,
                      onSubmitted: (_) => login(),
                      decoration: InputDecoration(
                        labelText: 'Password',
                        prefixIcon: const Icon(Icons.lock_outline),
                        suffixIcon: IconButton(
                          onPressed: () => setState(() => obscure = !obscure),
                          icon: Icon(
                            obscure
                                ? Icons.visibility_outlined
                                : Icons.visibility_off_outlined,
                          ),
                        ),
                      ),
                    ),
                    if (error.isNotEmpty)
                      Padding(
                        padding: const EdgeInsets.only(top: 13),
                        child: Text(
                          error,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    const SizedBox(height: 18),
                    FilledButton.icon(
                      onPressed: saving ? null : login,
                      icon: const Icon(Icons.login),
                      label: Text(saving ? 'Signing in…' : 'Sign in'),
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(50),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class VerificationRequest {
  VerificationRequest(this.data);
  final Map<String, dynamic> data;
  int get id => int.parse(data['id'].toString());
  String get status => data['status'].toString();
  String get customerName => data['customerName'].toString();
  String get customerPhone => data['customerPhone'].toString();
  String get address =>
      [
            data['customerAddress'],
            data['customerCity'],
            data['customerState'],
            data['customerPostalCode'],
          ]
          .where((value) => value != null && value.toString().trim().isNotEmpty)
          .join(', ');
  bool get complete => status == 'verified' || status == 'could_not_verify';
}

class HomePage extends StatefulWidget {
  const HomePage({
    super.key,
    required this.token,
    required this.user,
    required this.onSignOut,
  });
  final String token;
  final Map<String, dynamic> user;
  final Future<void> Function() onSignOut;
  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  StreamSubscription<RemoteMessage>? foregroundPush;
  StreamSubscription<String>? tokenRefresh;
  Timer? refreshTimer;
  List<VerificationRequest> requests = [];
  bool loading = true;
  String error = '';
  int tab = 0;
  @override
  void initState() {
    super.initState();
    refresh();
    _registerPush();
    refreshTimer = Timer.periodic(const Duration(seconds: 30), (_) {
      if (mounted && !loading) {
        unawaited(pollVerificationAssignments());
        unawaited(refresh(silent: true));
      }
    });
    if (firebaseConfigured) {
      foregroundPush = FirebaseMessaging.onMessage.listen((_) {
        unawaited(pollVerificationAssignments());
        unawaited(refresh(silent: true));
      });
      tokenRefresh = FirebaseMessaging.instance.onTokenRefresh.listen((
        value,
      ) async {
        try {
          await Api(widget.token).post('/verification/device', {
            'token': value,
            'platform': 'android',
          });
        } catch (_) {}
      });
    }
  }

  Future<void> _registerPush() async {
    if (!firebaseConfigured) return;
    try {
      await FirebaseMessaging.instance.requestPermission();
      final token = await FirebaseMessaging.instance.getToken();
      if (token != null) {
        await Api(
          widget.token,
        ).post('/verification/device', {'token': token, 'platform': 'android'});
      }
    } catch (_) {}
  }

  Future<void> refresh({bool silent = false}) async {
    if (mounted && !silent) {
      setState(() {
        loading = true;
        error = '';
      });
    }
    try {
      final response = await Api(widget.token).get('/verification/requests');
      if (response.statusCode == 401) {
        await widget.onSignOut();
        return;
      }
      if (response.statusCode != 200) {
        throw Exception(
          responseMessage(response, 'Unable to load assignments.'),
        );
      }
      final data = jsonDecode(response.body) as Map<String, dynamic>;
      final items = (data['requests'] as List<dynamic>? ?? [])
          .map((item) => VerificationRequest(item as Map<String, dynamic>))
          .toList();
      if (mounted) setState(() => requests = items);
    } catch (caught) {
      if (mounted) {
        setState(
          () => error = caught.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => loading = false);
    }
  }

  @override
  void dispose() {
    foregroundPush?.cancel();
    tokenRefresh?.cancel();
    refreshTimer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final visible = requests
        .where((request) => tab == 0 ? !request.complete : request.complete)
        .toList();
    return Scaffold(
      appBar: AppBar(
        title: const Row(
          children: [
            BrandMark(size: 38),
            SizedBox(width: 10),
            Text('Aryan Verification'),
          ],
        ),
        actions: [
          IconButton(onPressed: refresh, icon: const Icon(Icons.refresh)),
          PopupMenuButton<String>(
            onSelected: (value) {
              if (value == 'logout') widget.onSignOut();
            },
            itemBuilder: (_) => const [
              PopupMenuItem(value: 'logout', child: Text('Sign out')),
            ],
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: refresh,
        child: ListView(
          padding: const EdgeInsets.fromLTRB(16, 10, 16, 30),
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(18),
                child: Row(
                  children: [
                    const CircleAvatar(
                      child: Icon(Icons.person_pin_circle_outlined),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.user['name']?.toString() ?? 'TE user',
                            style: const TextStyle(
                              fontWeight: FontWeight.w800,
                              fontSize: 18,
                            ),
                          ),
                          Text(widget.user['userId']?.toString() ?? ''),
                        ],
                      ),
                    ),
                    Badge(
                      label: Text(
                        '${requests.where((request) => !request.complete).length} open',
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 14),
            SegmentedButton<int>(
              segments: const [
                ButtonSegment(
                  value: 0,
                  icon: Icon(Icons.assignment_outlined),
                  label: Text('Open'),
                ),
                ButtonSegment(
                  value: 1,
                  icon: Icon(Icons.task_alt),
                  label: Text('Completed'),
                ),
              ],
              selected: {tab},
              onSelectionChanged: (selection) =>
                  setState(() => tab = selection.first),
            ),
            const SizedBox(height: 14),
            if (loading)
              const Padding(
                padding: EdgeInsets.all(40),
                child: Center(child: CircularProgressIndicator()),
              )
            else if (error.isNotEmpty)
              ErrorCard(error: error, retry: refresh)
            else if (visible.isEmpty)
              const EmptyCard()
            else
              ...visible.map(
                (request) => Padding(
                  padding: const EdgeInsets.only(bottom: 11),
                  child: RequestCard(
                    request: request,
                    onOpen: () async {
                      await Navigator.push(
                        context,
                        MaterialPageRoute(
                          builder: (_) => RequestDetailPage(
                            token: widget.token,
                            request: request,
                          ),
                        ),
                      );
                      await refresh();
                    },
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}

class RequestCard extends StatelessWidget {
  const RequestCard({super.key, required this.request, required this.onOpen});
  final VerificationRequest request;
  final VoidCallback onOpen;
  @override
  Widget build(BuildContext context) => Card(
    clipBehavior: Clip.antiAlias,
    child: InkWell(
      onTap: onOpen,
      child: Padding(
        padding: const EdgeInsets.all(17),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                StatusChip(request.status),
                const Spacer(),
                Text(
                  '#${request.id}',
                  style: TextStyle(color: Colors.grey.shade600),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              request.customerName,
              style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w800),
            ),
            const SizedBox(height: 7),
            InfoLine(Icons.phone_outlined, '+91 ${request.customerPhone}'),
            InfoLine(
              Icons.home_outlined,
              request.address.isEmpty
                  ? 'Address not provided'
                  : request.address,
            ),
            const Divider(height: 24),
            InfoLine(
              Icons.store_outlined,
              request.data['branchName']?.toString() ?? '',
            ),
            InfoLine(
              Icons.person_outline,
              'BM ${request.data['bmName']} · +91 ${request.data['bmPhone']}',
            ),
          ],
        ),
      ),
    ),
  );
}

class RequestDetailPage extends StatefulWidget {
  const RequestDetailPage({
    super.key,
    required this.token,
    required this.request,
  });
  final String token;
  final VerificationRequest request;
  @override
  State<RequestDetailPage> createState() => _RequestDetailPageState();
}

class _RequestDetailPageState extends State<RequestDetailPage> {
  VisitVideo? visitVideo;
  bool preparingVideo = false;
  double compressionProgress = 0;
  final authName = TextEditingController(),
      authRelationship = TextEditingController(),
      authPhone = TextEditingController(),
      notes = TextEditingController(),
      failure = TextEditingController(),
      picker = ImagePicker();
  final references = <ReferenceFields>[ReferenceFields()];
  final photos = <XFile>[];
  String outcome = 'verified', error = '';
  bool saving = false;
  Future<void> call(String phone) async =>
      launchUrl(Uri.parse('tel:+91$phone'));
  Future<void> startVisit() async {
    final response = await Api(
      widget.token,
    ).post('/verification/requests', {'id': widget.request.id});
    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          responseMessage(
            response,
            response.statusCode == 200
                ? 'Visit started.'
                : 'Unable to start visit.',
          ),
        ),
      ),
    );
    if (response.statusCode == 200) {
      setState(() => widget.request.data['status'] = 'in_progress');
    }
  }

  Future<void> takePhoto() async {
    final photo = await picker.pickImage(
      source: ImageSource.camera,
      imageQuality: 82,
      maxWidth: 1800,
    );
    if (photo != null && mounted) setState(() => photos.add(photo));
  }

  Future<void> choosePhotos() async {
    final selected = await picker.pickMultiImage(
      imageQuality: 82,
      maxWidth: 1800,
    );
    if (selected.isNotEmpty && mounted) {
      setState(() => photos.addAll(selected.take(12 - photos.length)));
    }
  }

  Future<void> takeVideo() async {
    if (saving || preparingVideo) return;
    String? capturedPath;
    setState(() {
      preparingVideo = true;
      compressionProgress = 0;
      error = '';
    });
    final progress = VideoCompress.compressProgress$.subscribe((value) {
      if (mounted) {
        setState(() => compressionProgress = (value / 100).clamp(0, 1));
      }
    });
    try {
      final captured = await picker.pickVideo(
        source: ImageSource.camera,
        maxDuration: const Duration(minutes: 2),
      );
      if (captured == null) return;
      capturedPath = captured.path;
      final prepared = await compressVisitVideo(captured.path);
      if (!mounted) {
        await prepared.file.delete();
        return;
      }
      final old = visitVideo;
      setState(() => visitVideo = prepared);
      if (old != null &&
          old.file.path != prepared.file.path &&
          await old.file.exists()) {
        await old.file.delete();
      }
    } catch (caught) {
      if (mounted) {
        setState(
          () => error = caught.toString().replaceFirst('FormatException: ', ''),
        );
      }
    } finally {
      progress.unsubscribe();
      if (capturedPath != null && capturedPath != visitVideo?.file.path) {
        final original = File(capturedPath);
        if (await original.exists()) await original.delete();
      }
      if (mounted) setState(() => preparingVideo = false);
    }
  }

  Future<void> removeVideo() async {
    final old = visitVideo;
    setState(() => visitVideo = null);
    if (old != null && await old.file.exists()) await old.file.delete();
  }

  Future<void> submit() async {
    if (saving || preparingVideo) return;
    setState(() {
      saving = true;
      error = '';
    });
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$apiBase/verification/requests'),
      );
      request.headers.addAll(Api(widget.token).headers);
      request.fields.addAll({
        'id': widget.request.id.toString(),
        'outcome': outcome,
        'authenticationPersonName': authName.text,
        'authenticationPersonRelationship': authRelationship.text,
        'authenticationPersonPhone': authPhone.text,
        'verificationNotes': notes.text,
        'failureReason': failure.text,
        'references': jsonEncode(
          references.map((reference) => reference.toJson()).toList(),
        ),
      });
      for (final photo in photos) {
        request.files.add(
          await http.MultipartFile.fromPath(
            'photos',
            photo.path,
            filename: photo.name,
          ),
        );
      }
      if (visitVideo != null) {
        request.files.add(
          await http.MultipartFile.fromPath(
            'video',
            visitVideo!.file.path,
            filename: 'visit-video.mp4',
          ),
        );
      }
      if (request.contentLength > 40 * 1024 * 1024) {
        throw const FormatException(
          'Photos and video together must be smaller than 40 MB. Remove some photos or record a shorter video.',
        );
      }
      final response = await http.Response.fromStream(
        await request.send().timeout(const Duration(minutes: 5)),
      );
      if (response.statusCode != 200) {
        throw Exception(
          responseMessage(response, 'Unable to submit verification.'),
        );
      }
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(responseMessage(response, 'Verification saved.')),
        ),
      );
      Navigator.pop(context, true);
    } catch (caught) {
      if (mounted) {
        setState(
          () => error = caught.toString().replaceFirst('Exception: ', ''),
        );
      }
    } finally {
      if (mounted) setState(() => saving = false);
    }
  }

  @override
  void dispose() {
    authName.dispose();
    if (preparingVideo) unawaited(VideoCompress.cancelCompression());
    final videoFile = visitVideo?.file;
    if (videoFile != null) {
      unawaited(
        videoFile.exists().then((exists) async {
          if (exists) await videoFile.delete();
        }),
      );
    }
    authRelationship.dispose();
    authPhone.dispose();
    notes.dispose();
    failure.dispose();
    for (final reference in references) {
      reference.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final request = widget.request, complete = request.complete;
    return Scaffold(
      appBar: AppBar(title: Text('Verification #${request.id}')),
      body: ListView(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 36),
        children: [
          DetailCard(
            title: 'Customer details',
            icon: Icons.person_search_outlined,
            children: [
              Text(
                request.customerName,
                style: const TextStyle(
                  fontSize: 22,
                  fontWeight: FontWeight.w800,
                ),
              ),
              InfoLine(
                Icons.phone_outlined,
                '+91 ${request.customerPhone}',
                action: () => call(request.customerPhone),
              ),
              InfoLine(
                Icons.home_outlined,
                request.address.isEmpty
                    ? 'Address not provided'
                    : request.address,
              ),
              if ((request.data['customerEmail'] ?? '').toString().isNotEmpty)
                InfoLine(
                  Icons.email_outlined,
                  request.data['customerEmail'].toString(),
                ),
            ],
          ),
          DetailCard(
            title: 'Requesting branch manager',
            icon: Icons.store_outlined,
            children: [
              Text(
                request.data['branchName']?.toString() ?? '',
                style: const TextStyle(
                  fontWeight: FontWeight.w800,
                  fontSize: 17,
                ),
              ),
              InfoLine(
                Icons.badge_outlined,
                request.data['bmName']?.toString() ?? '',
              ),
              InfoLine(
                Icons.phone_in_talk_outlined,
                '+91 ${request.data['bmPhone']}',
                action: () => call(request.data['bmPhone'].toString()),
              ),
              if ((request.data['requestNotes'] ?? '').toString().isNotEmpty)
                InfoLine(
                  Icons.notes_outlined,
                  request.data['requestNotes'].toString(),
                ),
            ],
          ),
          if (!complete && request.status == 'assigned')
            Padding(
              padding: const EdgeInsets.only(bottom: 13),
              child: FilledButton.icon(
                onPressed: startVisit,
                icon: const Icon(Icons.directions_walk),
                label: const Text('Start home visit'),
                style: FilledButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
              ),
            ),
          if (!complete) ...[
            DetailCard(
              title: 'Visit photos',
              icon: Icons.add_a_photo_outlined,
              children: [
                Text(
                  'Take multiple photos at the customer home. At least two are required for a verified result.',
                  style: TextStyle(color: Colors.grey.shade700),
                ),
                const SizedBox(height: 10),
                Wrap(
                  spacing: 9,
                  runSpacing: 9,
                  children: [
                    OutlinedButton.icon(
                      onPressed: photos.length >= 12 ? null : takePhoto,
                      icon: const Icon(Icons.camera_alt_outlined),
                      label: const Text('Camera'),
                    ),
                    OutlinedButton.icon(
                      onPressed: photos.length >= 12 ? null : choosePhotos,
                      icon: const Icon(Icons.photo_library_outlined),
                      label: const Text('Gallery'),
                    ),
                  ],
                ),
                if (photos.isNotEmpty)
                  Padding(
                    padding: const EdgeInsets.only(top: 12),
                    child: Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: photos
                          .asMap()
                          .entries
                          .map(
                            (entry) => Stack(
                              children: [
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(8),
                                  child: Image.file(
                                    File(entry.value.path),
                                    width: 92,
                                    height: 92,
                                    fit: BoxFit.cover,
                                  ),
                                ),
                                Positioned(
                                  right: 2,
                                  top: 2,
                                  child: IconButton.filledTonal(
                                    onPressed: () => setState(
                                      () => photos.removeAt(entry.key),
                                    ),
                                    icon: const Icon(Icons.close, size: 16),
                                    visualDensity: VisualDensity.compact,
                                  ),
                                ),
                              ],
                            ),
                          )
                          .toList(),
                    ),
                  ),
              ],
            ),
            DetailCard(
              title: 'Visit video (optional)',
              icon: Icons.videocam_outlined,
              children: [
                const Text(
                  'Record up to 2 minutes. The video is compressed on your phone before upload.',
                ),
                const SizedBox(height: 12),
                if (preparingVideo) ...[
                  LinearProgressIndicator(
                    value: compressionProgress > 0 ? compressionProgress : null,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Preparing video… ${(compressionProgress * 100).round()}%',
                  ),
                ] else ...[
                  OutlinedButton.icon(
                    onPressed: saving ? null : takeVideo,
                    icon: const Icon(Icons.videocam),
                    label: Text(
                      visitVideo == null ? 'Record video' : 'Record again',
                    ),
                  ),
                  if (visitVideo != null) ...[
                    Text(
                      '${(visitVideo!.durationMs / 1000).ceil()} seconds · ${(visitVideo!.compressedBytes / 1048576).toStringAsFixed(1)} MB ready to upload',
                    ),
                    TextButton.icon(
                      onPressed: saving ? null : removeVideo,
                      icon: const Icon(Icons.delete_outline),
                      label: const Text('Remove video'),
                    ),
                  ],
                ],
              ],
            ),
            DetailCard(
              title: 'Authentication person',
              icon: Icons.verified_user_outlined,
              children: [
                TextField(
                  controller: authName,
                  decoration: const InputDecoration(labelText: 'Full name'),
                ),
                const SizedBox(height: 11),
                TextField(
                  controller: authRelationship,
                  decoration: const InputDecoration(
                    labelText: 'Relationship / designation',
                  ),
                ),
                const SizedBox(height: 11),
                TextField(
                  controller: authPhone,
                  keyboardType: TextInputType.phone,
                  maxLength: 10,
                  decoration: const InputDecoration(
                    labelText: 'Mobile number',
                    counterText: '',
                  ),
                ),
              ],
            ),
            DetailCard(
              title: 'Customer references',
              icon: Icons.groups_outlined,
              children: [
                ...references.asMap().entries.map(
                  (entry) => ReferenceEditor(
                    index: entry.key,
                    fields: entry.value,
                    remove: references.length == 1
                        ? null
                        : () {
                            final removed = references.removeAt(entry.key);
                            removed.dispose();
                            setState(() {});
                          },
                  ),
                ),
                OutlinedButton.icon(
                  onPressed: references.length >= 10
                      ? null
                      : () => setState(() => references.add(ReferenceFields())),
                  icon: const Icon(Icons.person_add_alt),
                  label: const Text('Add another reference'),
                ),
              ],
            ),
            DetailCard(
              title: 'Verification result',
              icon: Icons.fact_check_outlined,
              children: [
                RadioGroup<String>(
                  groupValue: outcome,
                  onChanged: (value) =>
                      setState(() => outcome = value ?? 'verified'),
                  child: const Column(
                    children: [
                      RadioListTile(
                        value: 'verified',
                        title: Text('Verified'),
                        subtitle: Text(
                          'Identity and residence were successfully confirmed.',
                        ),
                      ),
                      RadioListTile(
                        value: 'could_not_verify',
                        title: Text('Could not be verified'),
                        subtitle: Text(
                          'Visit or identity checks could not be completed.',
                        ),
                      ),
                    ],
                  ),
                ),
                TextField(
                  controller: notes,
                  maxLines: 4,
                  maxLength: 2000,
                  decoration: const InputDecoration(
                    labelText: 'Verification notes',
                  ),
                ),
                if (outcome == 'could_not_verify')
                  Padding(
                    padding: const EdgeInsets.only(top: 11),
                    child: TextField(
                      controller: failure,
                      maxLines: 3,
                      maxLength: 1000,
                      decoration: const InputDecoration(
                        labelText: 'Reason verification could not be completed',
                      ),
                    ),
                  ),
              ],
            ),
            if (error.isNotEmpty)
              Padding(
                padding: const EdgeInsets.only(bottom: 12),
                child: Text(error, style: const TextStyle(color: Colors.red)),
              ),
            FilledButton.icon(
              onPressed: saving || preparingVideo ? null : submit,
              icon: const Icon(Icons.cloud_upload_outlined),
              label: Text(saving ? 'Submitting…' : 'Submit final result'),
              style: FilledButton.styleFrom(
                minimumSize: const Size.fromHeight(52),
              ),
            ),
          ] else
            DetailCard(
              title: 'Completed result',
              icon: Icons.task_alt,
              children: [
                StatusChip(request.status),
                const SizedBox(height: 10),
                Text(
                  (request.data['verificationNotes'] ??
                          request.data['failureReason'] ??
                          'No notes')
                      .toString(),
                ),
                const SizedBox(height: 8),
                Text(
                  '${request.data['photoCount']} photos · ${request.data['videoCount'] ?? 0} videos · ${request.data['referenceCount']} references',
                ),
              ],
            ),
        ],
      ),
    );
  }
}

class ReferenceFields {
  final name = TextEditingController(),
      relationship = TextEditingController(),
      phone = TextEditingController(),
      notes = TextEditingController();
  Map<String, String> toJson() => {
    'name': name.text,
    'relationship': relationship.text,
    'phone': phone.text,
    'notes': notes.text,
  };
  void dispose() {
    name.dispose();
    relationship.dispose();
    phone.dispose();
    notes.dispose();
  }
}

class ReferenceEditor extends StatelessWidget {
  const ReferenceEditor({
    super.key,
    required this.index,
    required this.fields,
    this.remove,
  });
  final int index;
  final ReferenceFields fields;
  final VoidCallback? remove;
  @override
  Widget build(BuildContext context) => Container(
    margin: const EdgeInsets.only(bottom: 13),
    padding: const EdgeInsets.all(13),
    decoration: BoxDecoration(
      border: Border.all(color: Colors.grey.shade300),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Column(
      children: [
        Row(
          children: [
            Text(
              'Reference ${index + 1}',
              style: const TextStyle(fontWeight: FontWeight.w800),
            ),
            const Spacer(),
            if (remove != null)
              IconButton(
                onPressed: remove,
                icon: const Icon(Icons.delete_outline),
              ),
          ],
        ),
        TextField(
          controller: fields.name,
          decoration: const InputDecoration(labelText: 'Name'),
        ),
        const SizedBox(height: 9),
        TextField(
          controller: fields.relationship,
          decoration: const InputDecoration(labelText: 'Relationship'),
        ),
        const SizedBox(height: 9),
        TextField(
          controller: fields.phone,
          keyboardType: TextInputType.phone,
          maxLength: 10,
          decoration: const InputDecoration(
            labelText: 'Mobile number',
            counterText: '',
          ),
        ),
        const SizedBox(height: 9),
        TextField(
          controller: fields.notes,
          decoration: const InputDecoration(labelText: 'Reference notes'),
        ),
      ],
    ),
  );
}

class DetailCard extends StatelessWidget {
  const DetailCard({
    super.key,
    required this.title,
    required this.icon,
    required this.children,
  });
  final String title;
  final IconData icon;
  final List<Widget> children;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(bottom: 13),
    child: Card(
      child: Padding(
        padding: const EdgeInsets.all(17),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Icon(icon, color: Theme.of(context).colorScheme.primary),
                const SizedBox(width: 9),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 17,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ],
            ),
            const Divider(height: 25),
            ...children,
          ],
        ),
      ),
    ),
  );
}

class InfoLine extends StatelessWidget {
  const InfoLine(this.icon, this.text, {super.key, this.action});
  final IconData icon;
  final String text;
  final VoidCallback? action;
  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 8),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 18, color: Colors.grey.shade600),
        const SizedBox(width: 8),
        Expanded(child: Text(text)),
        if (action != null)
          IconButton(
            onPressed: action,
            icon: const Icon(Icons.call_outlined),
            visualDensity: VisualDensity.compact,
          ),
      ],
    ),
  );
}

class StatusChip extends StatelessWidget {
  const StatusChip(this.status, {super.key});
  final String status;
  @override
  Widget build(BuildContext context) {
    final Color color = switch (status) {
      'verified' => Colors.green,
      'could_not_verify' => Colors.red,
      'in_progress' => Colors.blue,
      _ => Colors.orange,
    };
    return Chip(
      label: Text(status.replaceAll('_', ' ')),
      avatar: Icon(
        status == 'verified' ? Icons.verified : Icons.shield_outlined,
        size: 17,
      ),
      backgroundColor: color.withValues(alpha: .12),
      side: BorderSide(color: color.withValues(alpha: .28)),
      labelStyle: TextStyle(color: color, fontWeight: FontWeight.w700),
    );
  }
}

class ErrorCard extends StatelessWidget {
  const ErrorCard({super.key, required this.error, required this.retry});
  final String error;
  final VoidCallback retry;
  @override
  Widget build(BuildContext context) => Card(
    child: Padding(
      padding: const EdgeInsets.all(24),
      child: Column(
        children: [
          const Icon(Icons.error_outline, color: Colors.red, size: 38),
          const SizedBox(height: 10),
          Text(error, textAlign: TextAlign.center),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: retry, child: const Text('Try again')),
        ],
      ),
    ),
  );
}

class EmptyCard extends StatelessWidget {
  const EmptyCard({super.key});
  @override
  Widget build(BuildContext context) => const Card(
    child: Padding(
      padding: EdgeInsets.all(40),
      child: Column(
        children: [
          Icon(Icons.assignment_turned_in_outlined, size: 46),
          SizedBox(height: 10),
          Text(
            'No verification requests here.',
            style: TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    ),
  );
}
