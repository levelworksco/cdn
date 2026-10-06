// file_service.dart
//
// Saves a file to the most appropriate location for each platform:
//
//   Desktop (Windows / macOS / Linux)  → ~/Downloads/<filename>
//   Android                            → /storage/emulated/0/Download/<filename>
//   iOS                                → App's Documents directory (accessible via Files app)
//
// If the Downloads folder is not accessible, falls back to the app's documents
// directory and returns the resolved path so the UI can inform the user.

import 'dart:io';
import 'package:path_provider/path_provider.dart';
import 'package:path/path.dart' as p;

class FileService {
  /// Write [content] to [filename] and return the absolute path of the saved file.
  Future<String> save(String filename, String content) async {
    final dir = await _resolveOutputDirectory();
    final file = File(p.join(dir.path, filename));

    // If a file with this name already exists, append a counter suffix.
    final resolved = await _uniquePath(file);
    await resolved.writeAsString(content, flush: true);

    return resolved.path;
  }

  Future<Directory> _resolveOutputDirectory() async {
    if (Platform.isAndroid) {
      // On Android, write directly to the public Downloads folder.
      const androidDownloads = '/storage/emulated/0/Download';
      final dir = Directory(androidDownloads);
      if (await dir.exists()) return dir;
    }

    if (Platform.isIOS) {
      // iOS: use the app Documents directory — visible in the Files app.
      return getApplicationDocumentsDirectory();
    }

    // Desktop (Windows / macOS / Linux): use the user's Downloads folder.
    final downloads = await _desktopDownloadsDir();
    if (downloads != null) return downloads;

    // Last resort — app documents directory.
    return getApplicationDocumentsDirectory();
  }

  Future<Directory?> _desktopDownloadsDir() async {
    try {
      final home = Platform.isWindows
          ? Platform.environment['USERPROFILE']
          : Platform.environment['HOME'];
      if (home == null) return null;

      final dir = Directory(p.join(home, 'Downloads'));
      if (await dir.exists()) return dir;
    } catch (_) {
      // Ignore; caller will fall back.
    }
    return null;
  }

  Future<File> _uniquePath(File file) async {
    if (!await file.exists()) return file;

    final ext = p.extension(file.path);
    final base = p.basenameWithoutExtension(file.path);
    final dir = file.parent;

    var counter = 1;
    while (true) {
      final candidate = File(p.join(dir.path, '$base ($counter)$ext'));
      if (!await candidate.exists()) return candidate;
      counter++;
    }
  }
}
