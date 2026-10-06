// webview_page.dart
//
// Hosts the Lit web component in the main WebView.
// Also manages hidden "extractor" WebViews that load ChatGPT share pages,
// execute their JavaScript, and scrape the rendered conversation data.
//
// Why a hidden WebView?
//   ChatGPT share pages are fully client-side rendered — the server returns
//   an empty shell HTML and JavaScript fetches + renders the conversation.
//   A plain HTTP GET returns no usable content. Loading the page in a real
//   WebView lets the browser engine execute the JavaScript, after which we
//   can query the live DOM for [data-message-author-role] elements.

import 'dart:async';
import 'dart:convert';
import 'dart:developer' as dev;

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:webview_flutter/webview_flutter.dart';

import '../bridge/flutter_bridge.dart';
import '../services/file_service.dart';

// JavaScript injected into the ChatGPT share page once it finishes loading.
// Polls every 500 ms for [data-message-author-role] elements to appear
// (the React app may take several seconds to fetch and render data).
// Sends result to the "ConversationExtractor" JS channel.
const _kExtractionScript = r"""
(function() {
  var MAX = 60;   // 30 seconds total
  var attempt = 0;

  function poll() {
    attempt++;
    var turns = document.querySelectorAll('[data-message-author-role]');

    if (turns.length > 0) {
      var messages = [];
      turns.forEach(function(t) {
        var role = t.getAttribute('data-message-author-role');
        if (role !== 'user' && role !== 'assistant') return;
        var text = (t.innerText || t.textContent || '').trim();
        if (text) messages.push({ role: role, content: text });
      });

      if (messages.length > 0) {
        var title = document.title
          .replace(/\s*[-|]\s*ChatGPT\s*$/i, '').trim() || 'ChatGPT Conversation';
        ConversationExtractor.postMessage(JSON.stringify({
          title: title,
          messages: messages,
        }));
        return;
      }
    }

    if (attempt < MAX) {
      setTimeout(poll, 500);
    } else {
      ConversationExtractor.postMessage(JSON.stringify({
        error: 'Timed out: no conversation content found after 30 seconds. ' +
               'The share link may be private or the page structure may have changed.',
      }));
    }
  }

  poll();
})();
""";

class WebViewPage extends StatefulWidget {
  const WebViewPage({super.key});

  @override
  State<WebViewPage> createState() => _WebViewPageState();
}

class _WebViewPageState extends State<WebViewPage> 
  with WidgetsBindingObserver {
  late final WebViewController _mainController;
  late final FlutterBridge _bridge;
  bool _loading = true;
  bool _webViewReady = false;

  // Active hidden extractors: id → (controller, completer)
  final Map<String, (WebViewController, Completer<Map<String, dynamic>>)>
      _extractors = {};

  @override
  void initState() {
    super.initState();

    print('INIT STATE');

    WidgetsBinding.instance.addObserver(this); // here

    _mainController = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..addJavaScriptChannel(
        'FlutterBridge',
        onMessageReceived: (JavaScriptMessage msg) {
          _bridge.handle(msg.message);
        },
      )
      // ..setNavigationDelegate(NavigationDelegate(
      //   onPageFinished: (url) {
      //     if (!_webViewReady) {
      //       _webViewReady = true;
      //       _loadMainPage();
      //     } else {
      //       setState(() => _loading = false);
      //     }
      //   },
      //   onWebResourceError: (e) => debugPrint('WebView error [${e.errorCode}]: ${e.description}'),
      // ))
      ..setNavigationDelegate(
      NavigationDelegate(
        onPageStarted: (url) {
          print('MAIN STARTED: $url');
        },

        onPageFinished: (url) {
          print('MAIN FINISHED: $url');

          if (!_webViewReady) {
            print('MAIN: Loading test HTML');
            _webViewReady = true;
            _loadMainPage();
          } else {
            print('MAIN: Removing spinner');
            setState(() => _loading = false);
          }
        },

        onWebResourceError: (e) {
          print(
            'MAIN ERROR ${e.errorCode}: ${e.description}',
          );
        },
      ),
    )
    ..loadRequest(Uri.parse('about:blank'));

    _bridge = FlutterBridge(
      controller:          _mainController,
      file:                FileService(),
      extractConversation: _extractConversation,
    );
  }

    // here
    @override
    void dispose() {
      print('DISPOSE');
      WidgetsBinding.instance.removeObserver(this);
      super.dispose();
    }

//   Future<void> _loadMainPage() async {
//     const testHtml = '''<!DOCTYPE html>
// <html><head><style>
// body { background: #f4f5f7; font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
// .card { background: white; border-radius: 16px; padding: 40px; box-shadow: 0 4px 32px rgba(0,0,0,.1); text-align: center; }
// h1 { color: #10a37f; }
// p { color: #555; }
// </style></head>
// <body>
// <div class="card">
//   <h1>WebKit Rendering Test</h1>
//   <p>If you can read this, WebKit is rendering correctly.</p>
//   <p id="timer">Time: 0s</p>
// </div>
// <script>
// let t = 0;
// setInterval(() => { document.getElementById("timer").textContent = "Time: " + (++t) + "s"; }, 1000);
// </script>
// </body></html>''';
//     await _mainController.loadHtmlString(testHtml, baseUrl: 'https://localhost/');
//   }

  Future<void> _loadMainPage() async {
    print('LOAD HTML CALLED');

    await _mainController.loadHtmlString(
      '''
  <!DOCTYPE html>
  <html>
  <body style="background:white;">
  <h1>HELLO WEBVIEW</h1>
  <button>Click me</button>
  </body>
  </html>
  ''',
    );
  // await _mainController.loadRequest(
  //   Uri.parse('https://example.com'),
  // );

    print('LOAD HTML RETURNED');
  }

  // ── Hidden WebView extraction ─────────────────────────────────────────────

  Future<Map<String, dynamic>> _extractConversation(String url) async {
    final id = DateTime.now().microsecondsSinceEpoch.toString();
    final completer = Completer<Map<String, dynamic>>();

    late final WebViewController extractor;
    extractor = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      // This channel receives the result from the injected polling script.
      ..addJavaScriptChannel(
        'ConversationExtractor',
        onMessageReceived: (JavaScriptMessage msg) {
          if (completer.isCompleted) return;
          try {
            final data = jsonDecode(msg.message) as Map<String, dynamic>;
            completer.complete(data);
          } catch (e) {
            completer.completeError('Failed to parse extraction result: $e');
          }
          // Remove this WebView from the tree once we have the result.
          if (mounted) setState(() => _extractors.remove(id));
        },
      )
      ..setNavigationDelegate(NavigationDelegate(
        onPageFinished: (finishedUrl) async {
          debugPrint('Extractor page loaded: $finishedUrl — injecting script');
          try {
            await extractor.runJavaScript(_kExtractionScript);
          } catch (e) {
            if (!completer.isCompleted) {
              completer.completeError('Script injection failed: $e');
              if (mounted) setState(() => _extractors.remove(id));
            }
          }
        },
        onWebResourceError: (e) {
          if (!completer.isCompleted) {
            completer.completeError('Page load error: ${e.description}');
            if (mounted) setState(() => _extractors.remove(id));
          }
        },
      ))
      ..loadRequest(Uri.parse(url));

    // Add to widget tree (must be present for WebView to execute JS).
    setState(() => _extractors[id] = (extractor, completer));

    // Time out after 35 seconds (script itself times out at 30 s).
    return completer.future.timeout(
      const Duration(seconds: 35),
      onTimeout: () {
        if (mounted) setState(() => _extractors.remove(id));
        return {'error': 'Extraction timed out. Please try again.'};
      },
    );
  }

  // ── Build ─────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    print('BUILD CALLED');
    return Scaffold(
      // Transparent so Flutter's GL layer doesn't block the WebKit GTK overlay.
      backgroundColor: Colors.transparent,
      body: Stack(
        children: [
          WebViewWidget(controller: _mainController),

          // for (final entry in _extractors.entries)
          //   Positioned(
          //     top: -2,
          //     left: -2,
          //     width: 1,
          //     height: 1,
          //     child: WebViewWidget(controller: entry.value.$1),
          //   ),

          // if (_loading)
          //   const Center(
          //     child: CircularProgressIndicator(
          //       valueColor: AlwaysStoppedAnimation<Color>(Color(0xFF10A37F)),
          //     ),
          //   ),
          if (_loading)
            Container(
              color: Colors.purple,
              child: const Center(
                child: Text(
                  'LOADING',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 40,
                  ),
                ),
              ),
            )
        ],
      ),
    );
  }


//   @override
// void didChangeAppLifecycleState(AppLifecycleState state) {
//   debugPrint('LIFECYCLE: $state');
// }

@override
void didChangeAppLifecycleState(AppLifecycleState state) {
  debugPrint('LIFECYCLE: $state');

  if (state == AppLifecycleState.resumed) {
    debugPrint('RESUMED');
  }
}

}
