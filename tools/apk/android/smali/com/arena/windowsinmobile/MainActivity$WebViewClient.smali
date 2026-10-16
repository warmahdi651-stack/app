.class public Lcom/arena/windowsinmobile/MainActivity$WebViewClient;
.super Landroid/webkit/WebViewClient;

.field private outer:Lcom/arena/windowsinmobile/MainActivity;

.method public constructor <init>(Lcom/arena/windowsinmobile/MainActivity;)V
    .registers 2
    iput-object p1, p0, Lcom/arena/windowsinmobile/MainActivity$WebViewClient;->outer:Lcom/arena/windowsinmobile/MainActivity;
    invoke-direct {p0}, Landroid/webkit/WebViewClient;-><init>()V
    return-void
.end method

# نسخهٔ قدیمی (اندروید ۶ و پایین‌تر)
.method public shouldOverrideUrlLoading(Landroid/webkit/WebView;Ljava/lang/String;)Z
    .registers 4
    const-string v0, "file:///android_asset/"
    invoke-virtual {p2, v0}, Ljava/lang/String;->startsWith(Ljava/lang/String;)Z
    move-result v0
    if-eqz v0, :external
    const/4 v0, 0x0
    return v0
:external
    iget-object v0, p0, Lcom/arena/windowsinmobile/MainActivity$WebViewClient;->outer:Lcom/arena/windowsinmobile/MainActivity;
    invoke-virtual {v0, p2}, Lcom/arena/windowsinmobile/MainActivity;->openExternal(Ljava/lang/String;)Z
    move-result v0
    return v0
.end method

# نسخهٔ جدید (اندروید ۷ و بالاتر)
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
    if-eqz v0, :external
    const/4 v0, 0x0
    return v0
:external
    iget-object v0, p0, Lcom/arena/windowsinmobile/MainActivity$WebViewClient;->outer:Lcom/arena/windowsinmobile/MainActivity;
    invoke-virtual {v0, v1}, Lcom/arena/windowsinmobile/MainActivity;->openExternal(Ljava/lang/String;)Z
    move-result v0
    return v0
:allow
    const/4 v0, 0x0
    return v0
.end method
