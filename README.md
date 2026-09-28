# R10 Filtreciniz

Sürüm: 1.4.0

Bu Chrome eklentisi, R10 konu listelerinde seçilen kullanıcıya ait satırları yerel olarak gizler.

## Güvenlik kapsamı

- Yalnızca `r10.net` ve `www.r10.net` üzerinde çalışır.
- Sunucuya istek göndermez; konu, mesaj veya hesap silmez.
- Yalnızca tarayıcıdaki konu listesi görünümünü değiştirir.
- Kullanıcı listesi `chrome.storage.local` içinde saklanır.
- Varsayılan olarak pasiftir.
- Filtre aktifken listedeki kullanıcıların açtığı tüm konu satırlarını ve postlarını gizler.
- Konu başlığı ve post mesajı filtreleri ayrı ayrı açılıp kapatılabilir; varsayılan olarak ikisi de açıktır.
- Eklenti penceresinde gizlenen/taranan konu ve post sayılarını ayrı gösterir.

## Kurulum

1. Chrome'da `chrome://extensions` adresini açın.
2. Geliştirici modunu etkinleştirin.
3. **Paketlenmemiş öğe yükle** seçeneğine basın.
4. Bu klasörü seçin: `r10-konu-filtreleyici`
5. R10 konu listesine gidip eklenti simgesinden filtreyi açın.

## Kullanım

Kullanıcı adlarını ekleyin ve filtreyi aktif edin. Eklenen kullanıcıların konu sahibi olduğu satırlar ve konu içindeki postları gizlenir.

Değişikliklerden sonra R10 liste sayfasını yenileyin. Satırlar silinmez; sadece sizin tarayıcınızda görünmez olur.
Güncel kaynak kodu GitHub deposunda doğrudan görülebilir.
