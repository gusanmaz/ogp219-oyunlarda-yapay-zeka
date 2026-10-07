# OGP219 Oyunlarda Yapay Zekâ

**Anadolu Üniversitesi · Oyun Geliştirme ve Programlama**

Oyun yapay zekâsı algoritmalarına geçmeden önce ihtiyaç duyulan temel algoritmalar ve veri yapıları için etkileşimli ders slaytları.

🔗 **Slaytlar:** https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/

## Ders haritası

Büyük konular, Princeton’daki gibi alt konulara (ayrı destelere) bölünmüştür.

**Bölüm 1 · Temeller**

| # | Konu | Durum |
|---|------|-------|
| 01 | [Union–Find](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/union-find/) | ✅ hazır |
| 02 | [Algoritma Analizi](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/algoritma-analizi/) | ✅ hazır |
| 03 | [Bağlı Listeler](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/bagli-listeler/) | ✅ hazır |
| 04 | [Yığınlar ve Kuyruklar](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/yiginlar-kuyruklar/) | ✅ hazır |
| 05 | [Arama Algoritmaları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/arama-algoritmalari/) | ✅ hazır |

**Bölüm 2 · Sıralama**

| # | Konu | Durum |
|---|------|-------|
| 06 | [Temel Sıralama Algoritmaları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/siralama-temel/) | ✅ hazır |
| 07 | [Mergesort](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/mergesort/) | ✅ hazır |
| 08 | [Quicksort](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/quicksort/) | ✅ hazır |

**Bölüm 3 · Arama Ağaçlari**

| # | Konu | Durum |
|---|------|-------|
| 09 | [Ağaçlar ve İkili Arama Ağaçları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/agaclar-bst/) | ✅ hazır |
| 10 | [Dengeli Arama Ağaçları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/dengeli-agaclar/) | ✅ hazır |
| 11 | [BST’nin Geometrik Uygulamaları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/bst-geometrik/) | ✅ hazır |

**Bölüm 4 · Önceli̇k Kuyruklari Ve Hash**

| # | Konu | Durum |
|---|------|-------|
| 12 | [Öncelik Kuyrukları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/oncelik-kuyruklari/) | ✅ hazır |
| 13 | [Hash Tabloları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/hash-tablolari/) | ✅ hazır |
| 14 | [Sembol Tablosu Uygulamaları](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/st-uygulamalari/) | ✅ hazır |

**Bölüm 5 · Graflar**

| # | Konu | Durum |
|---|------|-------|
| 15 | [Yönsüz Graflar](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/yonsuz-graflar/) | ✅ hazır |
| 16 | [Yönlü Graflar](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/yonlu-graflar/) | ✅ hazır |
| 17 | [Minimum Yayılan Ağaçlar](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/mst/) | ✅ hazır |
| 18 | [En Kısa Yollar](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/en-kisa-yollar/) | ✅ hazır |

Sonraki bölüm: oyunlara özel yapay zekâ algoritmaları ve veri yapıları.

## Slaytların özellikleri

- Açık / koyu tema (`T`)
- Satır numaralı kod örnekleri: Python, C# ve JavaScript sekmeleri; 🔍 ya da `Z` ile kod büyüteci
- Adım adım ilerletilebilen animasyonlar ve oyunlardan örnek demolar
- Tarayıcıda çalışan JavaScript ve Python (Pyodide) kod laboratuvarları
- A/B/C/D quizler, konuşmacı notları (`S`)

**Bölüm 6–11 · Oyun Yapay Zekâsı**

| # | Konu | Durum |
|---|------|-------|
| Y0 | [Oyun YZ’si İçin Hazırlık](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/yz-hazirlik/) | ✅ hazır |
| Y1 | [Oyun Yapay Zekâsına Giriş](https://gusanmaz.github.io/ogp219-oyunlarda-yapay-zeka/yz-giris/) | ✅ hazır |

## Klasör yapısı

```
index.html          ders haritası (ana sayfa)
ortak/              tüm destelerin ortak stil ve kodları
  deck.css          tema ve slayt stilleri
  core.js           tema, kod büyüteci, sekmeler, quiz, adım adım oynatıcı, kod laboratuvarı iskeleti
  siralama.js       sıralama görselleştirmeleri
  agac.js           ağaç görselleştirmeleri
  arama.js          arama görselleştirmeleri ve ikili arama laboratuvarı
  liste.js          dizi ve bağlı liste görselleştirmeleri, liste laboratuvarı
  yigin.js          yığın ve kuyruk görselleştirmeleri, fonksiyon laboratuvarı
  birlesim.js       union–find görselleştirmeleri, labirent, perkolasyon
  analiz.js         ölçüm deneyleri, kare bütçesi, bellek, büyüme laboratuvarı
  mergesort.js      mergesort görselleştirmeleri, birleştirme laboratuvarı
  quicksort.js      quicksort, üç yollu bölümleme, quickselect, bölümleme laboratuvarı
  dengeli.js        2-3 ağacı, kırmızı-siyah BST, döndürme, B-ağacı hesaplayıcı, döndürme laboratuvarı
  geometri.js       süpürme doğrusu, kd-ağacı, aralık ağacı, sweep and prune, geometri laboratuvarı
  oncelik.js        ikili yığın, heapsort, en iyi k, zamanlayıcı, swim/sink laboratuvarı
  hash.js           string hash, ayrı zincirleme, doğrusal yoklama, uzaysal hash, hash laboratuvarı
  st.js             kelime sıklığı, yerelleştirme, ters dizin, seyrek matris, Markov replikleri
  graf.js           graf çizimi, DFS/BFS iz tablosu, ızgara haritalar, ada sayma, graf laboratuvarı
  yonlu.js          topolojik sıralama, döngü tespiti, Kosaraju, çöp toplayıcı, yönlü graf laboratuvarı
  mst.js            kesme özelliği, Kruskal, Prim, prosedürel zindan, MST laboratuvarı
  sp.js             gevşetme, Dijkstra, arazili harita, kritik yol, Bellman–Ford arbitraj, Dijkstra laboratuvarı
  oyunai.js         oyun YZ’si simülasyon motoru: vektörler, dünya döngüsü, simlab, ailab
union-find/         01 · Union–Find
algoritma-analizi/  02 · Algoritma analizi
bagli-listeler/     03 · Bağlı listeler
yiginlar-kuyruklar/ 04 · Yığınlar ve kuyruklar
arama-algoritmalari/ 05 · Arama algoritmaları
siralama-temel/     06 · Temel sıralama algoritmaları
mergesort/          07 · Mergesort
quicksort/          08 · Quicksort
agaclar-bst/        09 · Ağaçlar ve ikili arama ağaçları
dengeli-agaclar/    10 · Dengeli arama ağaçları
bst-geometrik/      11 · BST’nin geometrik uygulamaları
oncelik-kuyruklari/ 12 · Öncelik kuyrukları
hash-tablolari/     13 · Hash tabloları
st-uygulamalari/    14 · Sembol tablosu uygulamaları
yonsuz-graflar/     15 · Yönsüz graflar
yonlu-graflar/      16 · Yönlü graflar
mst/                17 · Minimum yayılan ağaçlar
en-kisa-yollar/     18 · En kısa yollar
yz-hazirlik/        Y0 · Oyun YZ’si için hazırlık (vektörler, zaman)
yz-giris/           Y1 · Oyun YZ’sine giriş (ajan, Pac-Man, zorluk)
```

Her deste kendi klasöründe bir `index.html` ve desteye özel demoların bulunduğu `demos.js` dosyasından oluşur. Yerelde açmak için `index.html` dosyasını tarayıcıda açmak yeterlidir (kütüphaneler CDN’den yüklenir; internet gerekir).

## Kaynak

Konu akışı R. Sedgewick ve K. Wayne’in [Algorithms, 4th Edition](https://algs4.cs.princeton.edu/) kitabını ve Princeton [ders slaytlarını](https://algs4.cs.princeton.edu/lectures/) izler.
