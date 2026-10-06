# Flutter Linux Black Screen Debugging Plan

## Current Status

### Confirmed Working

* Flutter application starts successfully.
* Flutter engine initializes successfully.
* Linux desktop embedding is functioning.
* No Dart exceptions during startup.
* No plugin registration failures.
* Replacing the UI with a simple text widget renders correctly.

Tested widget:

```dart
@override
Widget build(BuildContext context) {
  return const Scaffold(
    body: Center(
      child: Text(
        'Flutter is rendering correctly',
        style: TextStyle(fontSize: 30),
      ),
    ),
  );
}
```

Result:

* Text appears correctly.
* Therefore Flutter rendering is NOT the problem.

### Primary Suspect

The issue appears to be related to the WebView implementation on Linux.

Current app uses:

```dart
WebViewWidget(controller: _mainController)
```

Dependencies include:

```yaml
webview_flutter: ^4.10.0
webview_all: ^1.0.3
```

Build logs show:

```text
libwebview_all_linux_plugin.so
```

which suggests Linux WebView functionality may be coming from `webview_all`.

---

# Investigation Steps

Run the following tests one by one and record the results.

---

## Test 1: Verify Widget Tree Without WebView

File:

```text
lib/webview_page.dart
```

Replace:

```dart
WebViewWidget(controller: _mainController)
```

with:

```dart
Container(
  color: Colors.red,
)
```

### Expected Result

If a red screen appears:

* Flutter rendering works.
* Scaffold works.
* Stack layout works.
* The WebView itself is failing.

### Record

Result:

```
<fill here>
```

---

## Test 2: Check Current Display Server

Run:

```bash
echo $XDG_SESSION_TYPE
```

### Possible Results

```text
wayland
```

or

```text
x11
```

### Record

Result:

```
<fill here>
```

---

## Test 3: Force X11 Backend

If Test 2 returns `wayland`, run:

```bash
GDK_BACKEND=x11 flutter run -d linux
```

### Expected Result

If WebView suddenly renders:

* Issue is Wayland/WebKitGTK related.

### Record

Result:

```
<fill here>
```

---

## Test 4: Force Software OpenGL Rendering

Run:

```bash
LIBGL_ALWAYS_SOFTWARE=1 flutter run -d linux
```

### Expected Result

If WebView renders:

* GPU acceleration issue.
* Graphics driver issue.
* WebKitGTK compositing issue.

### Record

Result:

```
<fill here>
```

---

## Test 5: Verify Installed WebKit Packages

Ubuntu/Debian:

```bash
dpkg -l | grep webkit
```

or

```bash
apt list --installed | grep webkit
```

### Expected Packages

Examples:

```text
libwebkit2gtk-4.1-0
libwebkit2gtk-4.1-dev
```

or

```text
libwebkit2gtk-4.0-37
```

### Record

Output:

```
<fill here>
```

---

## Test 6: Add Navigation Logging

File:

```text
lib/webview_page.dart
```

Add:

```dart
_mainController.setNavigationDelegate(
  NavigationDelegate(
    onPageStarted: (url) {
      print('STARTED: $url');
    },
    onPageFinished: (url) {
      print('FINISHED: $url');
    },
    onWebResourceError: (error) {
      print('ERROR: ${error.description}');
    },
  ),
);
```

Run:

```bash
flutter run -d linux
```

### Record

Console Output:

```
<fill here>
```

---

## Test 7: Check Linux Session Information

Run:

```bash
uname -a
```

```bash
lsb_release -a
```

```bash
echo $XDG_SESSION_TYPE
```

### Record

Output:

```
<fill here>
```

---

## Test 8: Capture Verbose Flutter Logs

Run:

```bash
flutter run -d linux -v > flutter_linux_verbose.log 2>&1
```

### Record

Attach:

```text
flutter_linux_verbose.log
```

---

## Test 9: Check Whether WebView Is Loading Any URL

Locate code that performs:

```dart
controller.loadRequest(...)
```

or

```dart
controller.loadHtmlString(...)
```

Record:

* URL being loaded
* Whether callbacks fire
* Whether `onPageFinished` is reached

### Record

```
<fill here>
```

---

# Files Potentially Relevant

Please review the following files if the issue remains unresolved:

```text
lib/main.dart
lib/webview_page.dart

linux/runner/main.cc
linux/runner/my_application.cc

linux/CMakeLists.txt
linux/flutter/CMakeLists.txt

pubspec.yaml
```

---

# Preliminary Conclusion

Current evidence strongly suggests:

1. Flutter Linux rendering is functioning correctly.
2. Linux embedding is functioning correctly.
3. Application startup is functioning correctly.
4. The failure occurs specifically when the WebView is rendered.
5. Most likely causes:

   * WebKitGTK issue
   * Wayland compatibility issue
   * GPU compositing issue
   * Linux plugin incompatibility
   * `webview_all` Linux integration issue

The next goal is to determine which of the above is responsible by executing the tests in this document sequentially.
