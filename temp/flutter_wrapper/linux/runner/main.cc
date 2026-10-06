#include <glib.h>
#include "my_application.h"

int main(int argc, char** argv) {
  // Force WebKit to use shared-memory (Cairo) rendering instead of DMA-BUF.
  // On Wayland, the DMA-BUF path creates its own subsurface below Flutter's
  // EGL subsurface, making the WebView invisible. The Cairo path renders to
  // the GTK main surface, which shows through Flutter's transparent GL layer.
  g_setenv("WEBKIT_DISABLE_DMABUF_RENDERER", "1", FALSE);
  g_setenv("WEBKIT_DISABLE_COMPOSITING_MODE", "1", FALSE);

  g_autoptr(MyApplication) app = my_application_new();
  return g_application_run(G_APPLICATION(app), argc, argv);
}
