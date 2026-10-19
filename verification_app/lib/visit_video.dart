import 'dart:io';
import 'package:video_compress/video_compress.dart';

const maxVisitVideoMilliseconds = 120000;
const maxVisitVideoBytes = 25 * 1024 * 1024;

void validateVisitVideo(double? durationMs, {int? byteSize}) {
  if (durationMs == null || !durationMs.isFinite || durationMs <= 0) {
    throw const FormatException(
      'Unable to read this video. Please record it again.',
    );
  }
  if (durationMs > maxVisitVideoMilliseconds) {
    throw const FormatException(
      'Video must be no longer than 2 minutes. Please record a shorter video.',
    );
  }
  if (byteSize != null && (byteSize <= 0 || byteSize > maxVisitVideoBytes)) {
    throw const FormatException(
      'The compressed video is too large. Please record a shorter video.',
    );
  }
}

class VisitVideo {
  const VisitVideo(
    this.file,
    this.durationMs,
    this.originalBytes,
    this.compressedBytes,
  );
  final File file;
  final double durationMs;
  final int originalBytes;
  final int compressedBytes;
}

Future<VisitVideo> compressVisitVideo(String inputPath) async {
  final original = await VideoCompress.getMediaInfo(inputPath);
  validateVisitVideo(original.duration);
  final originalBytes = await File(inputPath).length();
  final output = await VideoCompress.compressVideo(
    inputPath,
    quality: VideoQuality.Res640x480Quality,
    frameRate: 24,
    includeAudio: true,
    deleteOrigin: false,
  );
  if (output?.file == null || output!.isCancel == true) {
    throw const FormatException(
      'Video compression did not finish. Please try again.',
    );
  }
  final file = output.file!;
  try {
    final actual = await VideoCompress.getMediaInfo(file.path);
    final bytes = await file.length();
    validateVisitVideo(actual.duration, byteSize: bytes);
    return VisitVideo(file, actual.duration!, originalBytes, bytes);
  } catch (_) {
    if (file.path != inputPath && await file.exists()) await file.delete();
    rethrow;
  }
}
