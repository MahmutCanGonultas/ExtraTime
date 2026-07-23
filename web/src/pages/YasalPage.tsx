import type { ReactNode } from 'react'
import {
  ShieldCheck,
  Info,
  Scale,
  WalletMinimal,
  Trophy,
  Database,
  Lock,
  TriangleAlert,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// A standalone, human-readable "Terms & Legal Notice" page. It expands the short
// disclaimer shown in the site footer into a full document, so the project's
// non-commercial, non-betting nature is stated unambiguously and can be linked to.
// Static content only — no state, no data fetching.
export function YasalPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {/* Hero */}
      <header>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-ink-800 bg-ink-900 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-brand-300">
          <ShieldCheck className="h-3.5 w-3.5" /> Yasal Bilgilendirme
        </span>
        <h1 className="mt-3 text-2xl font-bold text-ink-100 sm:text-3xl">
          Kullanım Şartları ve Yasal Bilgilendirme
        </h1>
        <p className="mt-2 text-sm text-ink-500">
          ExtraTime'ı kullanmadan önce lütfen bu metni okuyun. Son güncelleme: Temmuz 2026.
        </p>
      </header>

      {/* The single most important statement, made prominent. */}
      <div className="rounded-card border border-brand-500/40 bg-brand-500/5 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
            <Scale className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-ink-100">
              ExtraTime bir bahis, kumar veya iddaa platformu değildir.
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-ink-400">
              Platformda oran sunulmaz, para veya herhangi bir bedel yatırılmaz, ödül ya da maddi
              kazanç dağıtılmaz. Skor tahmini yalnızca birbirini tanıyan arkadaşlar arasında,
              maddi karşılığı olmayan sembolik puanlarla ve tamamen eğlence amacıyla oynanır.
            </p>
          </div>
        </div>
      </div>

      <Section icon={Info} title="ExtraTime nedir?">
        <p>
          ExtraTime; yazılım geliştirme yetkinliklerini sergilemek amacıyla hazırlanmış, tamamen
          kişisel, eğitim amaçlı ve <Em>ticari olmayan</Em> bir portföy projesidir. Küçük bir
          arkadaş grubunun (~10 kişi) kullanımı için tasarlanmıştır ve üç işlevi vardır: futbol
          verilerini görüntülemek, arkadaşlar arası eğlence amaçlı bir skor tahmin oyunu ve basit
          istatistikler.
        </p>
      </Section>

      <Section icon={ShieldCheck} title="Bahis veya kumar değildir">
        <p>
          Bu platform bir <Em>bahis, kumar, iddaa veya şans oyunu sitesi değildir</Em> ve bu
          nitelikte hiçbir faaliyet yürütmez, buna aracılık etmez veya özendirmez.
        </p>
        <ul className="space-y-1.5">
          <Li>Bahis oranı (sabit ihtimalli veya müşterek) sunulmaz.</Li>
          <Li>Kullanıcılardan para veya herhangi bir bedel alınmaz; kupon veya bahis düzenlenmez.</Li>
          <Li>Kazanana ikramiye, ödül, nakit veya maddi değeri olan hiçbir şey verilmez.</Li>
          <Li>Herhangi bir bahis şirketine bağlantı, reklam veya yönlendirme içermez.</Li>
        </ul>
        <p>
          Bahis ve kumarı tanımlayan asıl unsur, bir bedel karşılığında maddi kazanç elde
          edilmesidir. ExtraTime'da bu unsur baştan sona bulunmaz; bu nedenle spor müsabakalarına
          dayalı bahis ve şans oyunlarını düzenleyen mevzuat (<Em>7258 sayılı Kanun</Em>) kapsamında
          bir faaliyet teşkil etmez.
        </p>
      </Section>

      <Section icon={WalletMinimal} title="Para ve ödeme yoktur">
        <p>
          Platform herhangi bir ödeme altyapısı içermez ve içermeyecektir. Kullanıcılardan ödeme
          ya da finansal bilgi talep edilmez; kullanıcılardan hiçbir finansal beklenti yoktur.
          Uygulamanın hiçbir bölümünde para girişi ya da çıkışı mümkün değildir.
        </p>
      </Section>

      <Section icon={Trophy} title="Skor tahmin oyunu nasıl çalışır?">
        <p>
          Kullanıcılar maç başlamadan önce skor tahmininde bulunur; maç bittiğinde tahminler
          sonuca göre <Em>sembolik puanlarla</Em> değerlendirilir ve grup içi bir sıralama oluşur.
          Bu puanların hiçbir parasal değeri yoktur, hiçbir şeyle takas edilemez ve yalnızca
          arkadaşlar arası eğlence ve rekabet amacı taşır.
        </p>
      </Section>

      <Section icon={Database} title="Veriler ve marka hakları">
        <p>
          Futbol verileri (fikstür, sonuç, kadro vb.) üçüncü taraf servislerden sağlanmaktadır.
          Tüm takım adları, logolar, amblemler ve marka hakları ilgili sahiplerine ait olup burada
          yalnızca tanımlama amacıyla kullanılmaktadır. ExtraTime bu markalarla resmî bir bağlantı,
          ortaklık veya onay ilişkisi içinde değildir.
        </p>
      </Section>

      <Section icon={Lock} title="Kişisel verilerin korunması (KVKK Aydınlatma Metni)">
        <p>
          6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında bu metin; ExtraTime'ı
          kullanırken hangi kişisel verilerinizin, hangi amaçla işlendiğini ve haklarınızı açıklar.
          Veri sorumlusu, projeyi kişisel ve ticari olmayan amaçla yürüten proje sahibidir.
        </p>

        <Sub>İşlenen veriler</Sub>
        <ul className="space-y-1.5">
          <Li>Hesap bilgileri: görünen ad ve giriş için e-posta adresi.</Li>
          <Li>Parola yalnızca geri döndürülemez biçimde (hash'lenerek) saklanır; açık hâlde tutulmaz.</Li>
          <Li>Oyun verileri: skor tahminleriniz, puanlarınız, grup içi sıralamanız ve seçtiğiniz avatar.</Li>
        </ul>

        <Sub>İşleme amaçları ve hukuki sebep</Sub>
        <p>
          Bu veriler yalnızca; hesabınızın oluşturulması ve girişin sağlanması, tahmin oyununun
          işletilmesi (tahmin, puanlama, sıralama) ve platformun arkadaş grubu içinde çalıştırılması
          amacıyla işlenir. Hukuki sebep, KVKK m.5 uyarınca hizmetin kurulması ve ifası ile veri
          sorumlusunun meşru menfaatidir. Verileriniz reklam veya pazarlama amacıyla kullanılmaz.
        </p>

        <Sub>Aktarım ve barındırma</Sub>
        <p>
          Veriler, uygulamanın çalışması için kullanılan bulut altyapılarında (veritabanı ve sunucu
          sağlayıcıları) barındırılır; bu sağlayıcıların sunucuları yurt dışında bulunabilir. Bu
          kapsamdaki yurt dışına aktarım KVKK m.9'a uygun olarak gerçekleştirilir. Verileriniz
          üçüncü kişilerle satılmaz veya pazarlama amacıyla paylaşılmaz.
        </p>

        <Sub>Saklama süresi</Sub>
        <p>
          Veriler, hesabınız aktif olduğu sürece saklanır; hesabınızın veya verilerinizin
          silinmesini talep ettiğinizde makul süre içinde silinir.
        </p>

        <Sub>Haklarınız (KVKK m.11)</Sub>
        <p>
          Kişisel verilerinize erişme; düzeltilmesini, silinmesini veya işlenmesine itiraz etme
          haklarına sahipsiniz. Bu taleplerinizi ve sorularınızı proje sahibine iletebilirsiniz.
          {/* İletişim e-postası eklemek isterseniz cümleyi şöyle güncelleyin:
              "...proje sahibine (ornek@eposta.com) iletebilirsiniz." */}
        </p>
      </Section>

      <Section icon={TriangleAlert} title="Sorumluluğun sınırlanması">
        <p>
          İçerik ve veriler "olduğu gibi" sunulur; gecikme veya hata içerebilir ve doğruluğu
          garanti edilmez. Platform eğlence ve öğrenme amaçlıdır; içeriğe dayanarak alınan
          kararlardan doğabilecek sonuçlardan proje sahibi sorumlu tutulamaz.
        </p>
      </Section>

      <p className="pt-2 text-center text-xs text-ink-600">
        Bu proje kişisel bir portföy çalışmasıdır ve ticari amaç gütmez. © {'2026'} EXTRATIME
      </p>
    </div>
  )
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className="elevate rounded-card border border-ink-800/70 bg-ink-900 p-5 sm:p-6">
      <h2 className="flex items-center gap-2.5 text-base font-bold text-ink-100">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-500/15 text-brand-300">
          <Icon className="h-4 w-4" />
        </span>
        {title}
      </h2>
      <div className="mt-3 space-y-2.5 text-sm leading-relaxed text-ink-400">{children}</div>
    </section>
  )
}

function Li({ children }: { children: ReactNode }) {
  return (
    <li className="flex gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
      <span>{children}</span>
    </li>
  )
}

function Em({ children }: { children: ReactNode }) {
  return <span className="font-semibold text-ink-200">{children}</span>
}

function Sub({ children }: { children: ReactNode }) {
  return <p className="pt-1 text-[13px] font-bold uppercase tracking-wide text-ink-300">{children}</p>
}
