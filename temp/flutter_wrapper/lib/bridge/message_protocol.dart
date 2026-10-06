// message_protocol.dart — typed bridge message protocol

import 'dart:convert';

enum BridgeRequestType {
  extractConversation, // load URL in hidden WebView, extract live DOM
  saveFile,
  log,
  unknown;

  static BridgeRequestType fromString(String s) => switch (s) {
        'extractConversation' => extractConversation,
        'saveFile'            => saveFile,
        'log'                 => log,
        _                     => unknown,
      };
}

class BridgeRequest {
  final String id;
  final BridgeRequestType type;
  final Map<String, dynamic> payload;

  const BridgeRequest({required this.id, required this.type, required this.payload});

  factory BridgeRequest.fromJson(String raw) {
    final map = jsonDecode(raw) as Map<String, dynamic>;
    return BridgeRequest(
      id:      map['id'] as String,
      type:    BridgeRequestType.fromString(map['type'] as String),
      payload: (map['payload'] as Map<String, dynamic>?) ?? {},
    );
  }
}

class BridgeResponse {
  static String success(String id, Map<String, dynamic> payload) =>
      jsonEncode({'id': id, 'type': 'response', 'payload': payload});

  static String error(String id, String message) =>
      jsonEncode({'id': id, 'type': 'error', 'payload': {'message': message}});
}
