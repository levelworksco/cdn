// flutter_bridge.dart
//
// Routes messages from the Lit component to Flutter services, then replies.
//
// extractConversation flow:
//   Lit sends  → { type: 'extractConversation', payload: { url } }
//   Flutter    → calls _extractConversation(url), which spins up a hidden
//                WebView, loads the URL, waits for JS to render the page,
//                injects extraction script, waits for result
//   Flutter replies → { title, messages } or { error: '...' }

import 'dart:developer' as dev;

import 'package:webview_flutter/webview_flutter.dart';

import 'message_protocol.dart';
import '../services/file_service.dart';

// Callback type: given a URL, returns extracted { title, messages } JSON map.
typedef ExtractConversationFn =
    Future<Map<String, dynamic>> Function(String url);

class FlutterBridge {
  final WebViewController _controller;
  final FileService _file;
  final ExtractConversationFn _extractConversation;

  FlutterBridge({
    required WebViewController controller,
    required FileService file,
    required ExtractConversationFn extractConversation,
  })  : _controller = controller,
        _file = file,
        _extractConversation = extractConversation;

  Future<void> handle(String rawMessage) async {
    late BridgeRequest req;
    try {
      req = BridgeRequest.fromJson(rawMessage);
    } catch (e) {
      dev.log('FlutterBridge: failed to parse message: $e');
      return;
    }

    switch (req.type) {
      case BridgeRequestType.extractConversation:
        await _handleExtractConversation(req);
      case BridgeRequestType.saveFile:
        await _handleSaveFile(req);
      case BridgeRequestType.log:
        _handleLog(req);
      case BridgeRequestType.unknown:
        dev.log('FlutterBridge: unrecognised type in: $rawMessage');
    }
  }

  Future<void> _handleExtractConversation(BridgeRequest req) async {
    final url = req.payload['url'] as String?;
    if (url == null || url.isEmpty) {
      await _reply(BridgeResponse.error(req.id, 'extractConversation: missing url'));
      return;
    }
    try {
      final result = await _extractConversation(url);
      await _reply(BridgeResponse.success(req.id, result));
    } catch (e) {
      await _reply(BridgeResponse.error(req.id, e.toString()));
    }
  }

  Future<void> _handleSaveFile(BridgeRequest req) async {
    final filename = req.payload['filename'] as String?;
    final content  = req.payload['content']  as String?;
    if (filename == null || content == null) {
      await _reply(BridgeResponse.error(req.id, 'saveFile: missing filename or content'));
      return;
    }
    try {
      final path = await _file.save(filename, content);
      dev.log('FlutterBridge: saved → $path');
      await _reply(BridgeResponse.success(req.id, {'path': path}));
    } catch (e) {
      await _reply(BridgeResponse.error(req.id, 'Failed to save file: $e'));
    }
  }

  void _handleLog(BridgeRequest req) {
    dev.log('[Lit] ${req.payload['message'] ?? ''}');
  }

  Future<void> _reply(String jsonResponse) async {
    final escaped = jsonResponse.replaceAll(r'\', r'\\').replaceAll("'", r"\'");
    await _controller.runJavaScript("window.handleFlutterResponse('$escaped')");
  }
}
