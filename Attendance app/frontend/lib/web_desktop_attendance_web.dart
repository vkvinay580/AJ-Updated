import 'dart:async';
import 'dart:convert';
import 'dart:js_interop';
import 'dart:typed_data';

import 'package:web/web.dart' as web;

bool hasFinePointerForAttendance() {
  return web.window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

bool hasTouchInputForAttendance() {
  return web.window.navigator.maxTouchPoints > 0 ||
      web.window.matchMedia('(any-pointer: coarse)').matches ||
      web.window.matchMedia('(pointer: coarse)').matches;
}

void clearFreshLoginBrowserStorage() {
  web.window.localStorage.clear();
  web.window.sessionStorage.clear();
}

Future<Uint8List?> capturePhotoWithBrowserCamera({
  String facingMode = 'user',
}) async {
  final completer = Completer<Uint8List?>();
  web.MediaStream? stream;

  final overlay = web.HTMLDivElement()
    ..style.position = 'fixed'
    ..style.left = '0'
    ..style.top = '0'
    ..style.right = '0'
    ..style.bottom = '0'
    ..style.zIndex = '2147483647'
    ..style.background = 'rgba(0, 0, 0, 0.94)'
    ..style.display = 'flex'
    ..style.flexDirection = 'column'
    ..style.alignItems = 'center'
    ..style.justifyContent = 'center'
    ..style.padding = '20px'
    ..style.boxSizing = 'border-box';

  final title = web.HTMLDivElement()
    ..textContent = 'Camera Capture'
    ..style.color = '#ffffff'
    ..style.fontSize = '20px'
    ..style.fontWeight = '700'
    ..style.marginBottom = '12px';

  final videoWrap = web.HTMLDivElement()
    ..style.width = 'min(720px, 100%)'
    ..style.maxHeight = '70vh'
    ..style.borderRadius = '18px'
    ..style.overflow = 'hidden'
    ..style.background = '#111111';

  final video = web.HTMLVideoElement()
    ..autoplay = true
    ..muted = true
    ..style.width = '100%'
    ..style.height = '100%'
    ..style.objectFit = 'cover';
  video.setAttribute('playsinline', 'true');

  final error = web.HTMLDivElement()
    ..style.color = '#fecaca'
    ..style.marginTop = '12px'
    ..style.maxWidth = '720px'
    ..style.textAlign = 'center';

  final actions = web.HTMLDivElement()
    ..style.display = 'flex'
    ..style.gap = '12px'
    ..style.flexWrap = 'wrap'
    ..style.justifyContent = 'center'
    ..style.marginTop = '18px';

  web.HTMLButtonElement button(String text) {
    return web.HTMLButtonElement()
      ..textContent = text
      ..style.border = '0'
      ..style.borderRadius = '999px'
      ..style.padding = '12px 20px'
      ..style.fontWeight = '700'
      ..style.cursor = 'pointer';
  }

  final captureButton = button('Capture Photo')
    ..style.background = '#ffffff'
    ..style.color = '#1f2937';
  final closeButton = button('Close')
    ..style.background = '#374151'
    ..style.color = '#ffffff';

  void finish(Uint8List? bytes) {
    if (completer.isCompleted) {
      return;
    }

    for (final track in stream?.getTracks().toDart ?? const []) {
      track.stop();
    }
    overlay.remove();
    completer.complete(bytes);
  }

  closeButton.addEventListener('click', ((web.Event _) => finish(null)).toJS);

  captureButton.addEventListener(
    'click',
    ((web.Event _) {
      try {
        final width = video.videoWidth;
        final height = video.videoHeight;

        if (width <= 0 || height <= 0) {
          error.textContent = 'Camera is not ready yet. Please try again.';
          return;
        }

        final canvas = web.HTMLCanvasElement()
          ..width = width
          ..height = height;
        final context = canvas.getContext('2d') as web.CanvasRenderingContext2D;
        context.drawImage(video, 0, 0, width, height);

        final dataUrl = canvas.toDataURL('image/jpeg', 0.88.toJS);
        final commaIndex = dataUrl.indexOf(',');

        if (commaIndex < 0) {
          error.textContent = 'Unable to capture photo.';
          return;
        }

        finish(base64Decode(dataUrl.substring(commaIndex + 1)));
      } catch (_) {
        error.textContent = 'Unable to capture photo.';
      }
    }).toJS,
  );

  videoWrap.appendChild(video);
  actions
    ..appendChild(captureButton)
    ..appendChild(closeButton);
  overlay
    ..appendChild(title)
    ..appendChild(videoWrap)
    ..appendChild(error)
    ..appendChild(actions);
  web.document.body?.appendChild(overlay);

  Future<web.MediaStream> openStream(web.MediaStreamConstraints constraints) {
    return web.window.navigator.mediaDevices.getUserMedia(constraints).toDart;
  }

  try {
    stream = await openStream(
      web.MediaStreamConstraints(
        audio: false.toJS,
        video: <String, Object>{
          'facingMode': <String, String>{'ideal': facingMode},
          'width': <String, int>{'ideal': 1280},
          'height': <String, int>{'ideal': 720},
        }.jsify()!,
      ),
    );
  } catch (_) {
    try {
      stream = await openStream(
        web.MediaStreamConstraints(audio: false.toJS, video: true.toJS),
      );
    } catch (error) {
      overlay.remove();
      final normalizedError = error.toString().toLowerCase();

      if (normalizedError.contains('notfound') ||
          normalizedError.contains('devicesnotfound') ||
          normalizedError.contains('no video input') ||
          normalizedError.contains('requested device not found')) {
        throw StateError('No camera was detected on this browser/device.');
      }

      if (normalizedError.contains('notallowed') ||
          normalizedError.contains('permission') ||
          normalizedError.contains('denied') ||
          normalizedError.contains('security')) {
        throw StateError(
          'Unable to access the camera. Please allow camera permission and use HTTPS or localhost.',
        );
      }

      throw StateError(
        'Unable to access the camera. Please allow camera permission and use HTTPS or localhost.',
      );
    }
  }

  video.srcObject = stream;

  try {
    await video.play().toDart;
  } catch (_) {
    // Some browsers start playback automatically after srcObject is assigned.
  }

  return completer.future;
}
