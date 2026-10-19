import 'package:aryan_verification/visit_video.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('validateVisitVideo', () {
    test('allows a video exactly two minutes long', () {
      expect(
        () => validateVisitVideo(
          maxVisitVideoMilliseconds.toDouble(),
          byteSize: maxVisitVideoBytes,
        ),
        returnsNormally,
      );
    });

    test('rejects a video longer than two minutes', () {
      expect(
        () => validateVisitVideo(maxVisitVideoMilliseconds + 1),
        throwsFormatException,
      );
    });

    test('rejects an oversized compressed video', () {
      expect(
        () => validateVisitVideo(30000, byteSize: maxVisitVideoBytes + 1),
        throwsFormatException,
      );
    });

    test('rejects missing duration metadata', () {
      expect(() => validateVisitVideo(null), throwsFormatException);
    });
  });
}
