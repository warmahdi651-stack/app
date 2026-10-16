.class public Lcom/arena/windowsinmobile/MainActivity$WebViewClient;
.super Landroid/webkit/WebViewClient;

.field private outer:Lcom/arena/windowsinmobile/MainActivity;

.method public constructor <init>(Lcom/arena/windowsinmobile/MainActivity;)V
    .registers 2
    iput-object p1, p0, Lcom/arena/windowsinmobile/MainActivity$WebViewClient;->outer:Lcom/arena/windowsinmobile/MainActivity;
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    return-void
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z
    .registers 4
    const-string v0, "file:///android_asset/"
    invoke-virtual {p2, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :external_old
    const/4 v0, 0x0
    return v0
:external_old
    iget-object v0, p0, Lcom/arena/windowsinmobile/MainActivity$WebViewClient;->outer:Lcom/arena/windowsinmobile/MainActivity;
    invoke-virtual {v0, p2}, Lcom/arena/windowsinmobile/MainActivity;->openExternal(Ljava/lang/String;)Z
    move-result v0
    return v0
.end method

.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;)Z
    .registers 5
    invoke-interface {p2}, Landroid/webkit/WebResourceRequest;->getUrl()Landroid/net/Uri;
    move-result-object v0
    if-eqz v0, :allow
    invoke-virtual {v0}, Landroid/net/Uri;->toString()Ljava/lang/String;
    move-result-object v1
    const-string v0, "file:///android_asset/"
    invoke-virtual {v1, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :external_new
    const/4 v0, 0x0
    return v0
:external_new
    iget-object v0, p0, Lcom/arena/windowsinmobile/MainActivity$WebViewClient;->outer:Lcom/arena/windowsinmobile/MainActivity;
    invoke-virtual {v0, v1}, Lcom/arena/windowsinmobile/MainActivity;->openExternal(Ljava/lang/String;)Z
    move-result v0
    return v0
:allow
    const/4 v0, 0x0
    return v0
.end method

# Both WebView error callbacks show a recoverable, English error page with a Reload button.
.method public onReceivedError(Landroid/webkit/WebView;ILjava/lang/String;Ljava/lang/String;)V
    .registers 5
    invoke-direct {p0, p1}, Lcom/arena/windowsinmobile/MainActivity$WebViewClient;->showErrorPage(Landroid/webkit/WebView;)V
    return-void
.end method

.method public onReceivedError(Landroid/webkit/WebView;Landroid/webkit/WebResourceRequest;Landroid/webkit/WebResourceError;)V
    .registers 4
    invoke-direct {p0, p1}, Lcom/arena/windowsinmobile/MainActivity$WebViewClient;->showErrorPage(Landroid/webkit/WebView;)V
    return-void
.end method

.method private showErrorPage(Landroid/webkit/WebView;)V
    .registers 13
    :try_start
    const-string v0, "file:///android_asset/"
    const-string v1, "<!doctype html><html><meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"><body style=\"font:16px sans-serif;background:#0b1120;color:white;display:grid;place-items:center;height:90vh;text-align:center\"><main><h2>Windows in Mobile</h2><p>Something went wrong while loading this screen.</p><button style=\"padding:12px 22px;border:0;border-radius:8px;background:#1687e8;color:white;font-size:16px\" onclick=\"location.href='file:///android_asset/index.html'\">Reload</button></main></body></html>"
    const-string v2, "text/html"
    const-string v3, "UTF-8"
    const/4 v4, 0x0
    move-object v5, p1
    move-object v6, v0
    move-object v7, v1
    move-object v8, v2
    move-object v9, v3
    move-object v10, v4
    invoke-virtual/range {v5 .. v10}, Landroid/webkit/WebView;->loadDataWithBaseURL(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :handled
    return-void
:handled
    return-void
.end method

# Android 8+ can kill the WebView renderer under memory pressure. Recover instead of closing the app.
.method public onRenderProcessGone(Landroid/webkit/WebView;Landroid/webkit/RenderProcessGoneDetail;)Z
    .registers 4
    :try_start
    iget-object v0, p0, Lcom/arena/windowsinmobile/MainActivity$WebViewClient;->outer:Lcom/arena/windowsinmobile/MainActivity;
    invoke-virtual {v0}, Lcom/arena/windowsinmobile/MainActivity;->reloadWebView()V
    :try_end
    .catch Ljava/lang/Exception; {:try_start .. :try_end} :renderer_handled
    const/4 v0, 0x1
    return v0
:renderer_handled
    const/4 v0, 0x1
    return v0
.end method
