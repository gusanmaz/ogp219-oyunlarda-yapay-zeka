# OGP219 Oyunlarda Yapay Zekâ

**Anadolu Üniversitesi · Oyun Geliştirme ve Programlama**

Oyun yapay zekâsı algoritmalarına geçmeden önce ihtiyaç duyulan temel algoritmalar ve veri yapıları için etkileşimli ders slaytları.

🔗 **Slaytlar:** https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/

## Ders haritası

| # | Konu | Durum |
|---|------|-------|
| 01 | Union–Find | hazırlanıyor |
| 02 | Algoritma Analizi | hazırlanıyor |
| 03 | Bağlı Listeler (dizi ile karşılaştırma) | hazırlanıyor |
| 04 | Yığınlar ve Kuyruklar | hazırlanıyor |
| 05 | [Arama Algoritmaları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/arama-algoritmalari/) | ✅ hazır |
| 06 | [Temel Sıralama Algoritmaları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/siralama-temel/) | ✅ hazır |
| 07 | Mergesort | sonra |
| 08 | Quicksort | sonra |
| 09 | [Ağaçlar ve İkili Arama Ağaçları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/agaclar-bst/) | ✅ hazır |
| 10 | Dengeli Arama Ağaçları | hazırlanıyor |
| 11 | BST Uygulamaları | hazırlanıyor |
| 12 | Öncelik Kuyrukları (Heap) | hazırlanıyor |
| 13 | Hash Tabloları | sonra |
| 14 | Graflar | sonra |

## Slaytların özellikleri

- Açık / koyu tema (`T`)
- Satır numaralı kod örnekleri: Python, C# ve JavaScript sekmeleri; 🔍 ya da `Z` ile kod büyüteci
- Adım adım ilerletilebilen animasyonlar ve oyunlardan örnek demolar
- Tarayıcıda çalışan JavaScript ve Python (Pyodide) kod laboratuvarları
- A/B/C/D quizler, konuşmacı notları (`S`)

## Klasör yapısı

```
index.html          ders haritası (ana sayfa)
ortak/              tüm destelerin ortak stil ve kodları
  deck.css          tema ve slayt stilleri
  core.js           tema, kod büyüteci, sekmeler, quiz, adım adım oynatıcı, kod laboratuvarı iskeleti
  siralama.js       sıralama görselleştirmeleri
  agac.js           ağaç görselleştirmeleri
  arama.js          arama görselleştirmeleri ve ikili arama laboratuvarı
arama-algoritmalari/ 05 · Arama algoritmaları
siralama-temel/     06 · Temel sıralama algoritmaları
agaclar-bst/        09 · Ağaçlar ve ikili arama ağaçları
```

Her deste kendi klasöründe bir `index.html` ve desteye özel demoların bulunduğu `demos.js` dosyasından oluşur. Yerelde açmak için `index.html` dosyasını tarayıcıda açmak yeterlidir (kütüphaneler CDN’den yüklenir; internet gerekir).

## Kaynak

Konu akışı R. Sedgewick ve K. Wayne’in [Algorithms, 4th Edition](https://algs4.cs.princeton.edu/) kitabını ve Princeton [ders slaytlarını](https://algs4.cs.princeton.edu/lectures/) izler.
