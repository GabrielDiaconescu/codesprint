# Revizuire de conformitate juridică — CodeSprint (România / UE)

**Pentru cine:** avocatul care confirmă textele înainte de lansare și operatorul aplicației.
Scris în română intenționat, spre deosebire de restul documentației.

**Ce este și ce nu este.** O revizuire a textelor juridice (`web/` și `web/ro/`) față de ce face
aplicația în realitate — cod, bază de date, servicii terțe — cu trimiteri la actele normative,
astfel încât avocatul să confirme un text aproape final în loc să pornească de la zero. **Nu este
consultanță juridică** și nu înlocuiește revizuirea unui avocat (SPEC §0.3, §41). Stadiul
legislativ a fost verificat la **10 octombrie 2026**.

**Ce s-a revizuit:** politica de confidențialitate, termenii de utilizare, pagina de ștergere a
contului și pagina de asistență — în engleză (`web/*.html`) și, nou, în română (`web/ro/*.html`).
Aplicația deschide varianta în limba interfeței; listarea din magazine, la fel.

---

## 1. Decizii care îți aparțin

Acestea nu sunt chestiuni de redactare: schimbă produsul. Textele au marcaje
`[DE CONFIRMAT DE AVOCAT]` exact în aceste locuri, iar `npm run release:check` blochează lansarea
până sunt rezolvate.

### D1. Vârsta minimă: 13 ani — cea mai importantă

Trei reguli se suprapun și niciuna nu se potrivește cu 13:

| Regula                                                                          | Ce spune                                                                                                                                            | Efect pentru 13 ani                                                                                         |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Codul civil, art. 43 și 41                                                      | Sub 14 ani: lipsa capacității de exercițiu. 14–18 ani: capacitate restrânsă (acte cu acordul părintelui)                                            | Un copil de 13 ani nu poate accepta singur termenii; contractul îl încheie reprezentantul legal             |
| RGPD art. 8 + Legea nr. 190/2018                                                | România nu a coborât vârsta consimțământului digital: rămâne **16 ani**                                                                             | Rezolvat deja: sub 16 ani nu cerem consimțământ (statistici oprite, reclame nepersonalizate)                |
| **Proiectul „Legea majoratului online” (L190/2025)** — încă neadoptat definitiv | Sub 16 ani, cont doar cu **acordul verificabil al părintelui**; reclamă pe bază de profilare interzisă; ANCOM; amenzi 0,1–0,4% din cifra de afaceri | Dacă trece în forma votată de Senat, conturile 13–15 ani fără acord parental trebuie blocate în 180 de zile |

Stadiul proiectului: adoptat de Senat la 6 octombrie 2025, trimis Camerei Deputaților (cameră
decizională) la 13 octombrie 2025; ultimul pas înregistrat pe site-ul Senatului este din februarie 2026. Excepția din proiect privește doar platformele educaționale **autorizate de Ministerul
Educației** — CodeSprint nu este.

Variante:

1. **16+ în SEE** — cea mai simplă și conformă cu toate trei, inclusiv cu proiectul. Pierzi
   publicul de 13–15 ani.
2. **14+** — rezolvă capacitatea civilă (cea mai clară problemă de azi); dacă proiectul devine
   lege, treci la varianta 1 sau 3. **Recomandarea mea**, ca pas imediat.
3. **13+ cu acord parental** — un flux nou (emailul părintelui, confirmare, păstrarea dovezii).
   Muncă reală și, sub proiect, „verificabil” poate cere mai mult decât un email.
4. Rămâne 13+ fără acord — riscul descris mai sus.

Tehnic, vârsta minimă este setarea `min_user_age` din `app_config` (se schimbă fără build nou),
plus textele listării („13 ani sau mai mult”). Clasificarea de vârstă din App Store (13+) poate
rămâne: ea privește conținutul, nu vârsta pentru cont.

### D2. Rapoartele de eroare și verificarea actualizărilor, fără consimțământ

Legea nr. 506/2004, art. 4 alin. (5), cere consimțământ pentru stocarea sau citirea de informații
pe dispozitiv, cu excepția celor **strict necesare** serviciului cerut. Ghidul CEPD 2/2023 citește
larg noțiunea de „acces”.

- **Sentry** (rapoarte de eroare) păstrează pe dispozitiv rapoartele netrimise și citește modelul
  și sistemul de operare. Variante: le considerăm strict necesare pentru securitate și funcționare
  (risc moderat, practică răspândită), sau le pornim doar cu consimțământ (o schimbare mică de cod;
  pierzi rapoartele celor care refuză).
- **Expo** (actualizări) păstrează un identificator aleatoriu al instalării. Fără el nu se pot
  livra remedieri de securitate; argumentul „strict necesar” este puternic aici.

Textul spune acum că le considerăm necesare, cu marcaj pentru avocat.

### D3. Rambursarea când elimini o funcție plătită sau închizi serviciul

Termenii §8 și §13 promit rambursarea părții nefolosite „prin magazin sau de către noi, dacă
magazinul nu o face” (OUG nr. 141/2021, art. 19 privind modificarea serviciilor digitale). Pe App
Store, dezvoltatorul nu poate rambursa direct; promisiunea „de către noi” cere un mijloc de plată.
Marcat `[DE CONFIRMAT]`.

### D4. Telefonul în datele de contact

Legea nr. 365/2002, art. 5, cere date care permit „contactarea rapidă”; textele dau emailul. Ambele
magazine publică oricum un număr de telefon (informațiile de comerciant din DSA). Avocatul să spună
dacă emailul ajunge pe site.

---

## 2. Constatări, pe acte normative

Stare: ✅ rezolvat în texte sau în aplicație · ⚠️ rămâne o acțiune · 🔍 de confirmat de avocat.

### Protecția datelor — RGPD, Legea nr. 190/2018

| Cerința                                                                                                                | Temei                     | Ce am găsit                                                                                                              | Acum                                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Informarea completă: operator, contact, DPO, scopuri, temeiuri, destinatari, transferuri, retenție, drepturi, plângere | art. 13–14                | Lipseau: date de identificare (ORC, CUI), declarația despre DPO, sursa datelor, deciziile automate                       | ✅ Politica §1–§8                                                                                                                                                                        |
| Temeiul pentru anul nașterii                                                                                           | art. 6, art. 8            | Era „contract”                                                                                                           | ✅ Obligație legală și interes legitim de a proteja minorii — 🔍                                                                                                                         |
| Temeiul pentru reclamele nepersonalizate                                                                               | art. 6; Legea 506/2004    | Era `[CONFIRM]`                                                                                                          | ✅ Consimțământ pentru accesul la dispozitiv; la refuz, Google poate afișa „reclame limitate”, fără identificatori                                                                       |
| Temeiul pentru raportări și moderare                                                                                   | art. 6 alin. (1) lit. c)  | Era doar interes legitim                                                                                                 | ✅ Și obligație legală, potrivit DSA                                                                                                                                                     |
| Destinatari lipsă                                                                                                      | art. 13 alin. (1) lit. e) | **Expo** (actualizări: IP, sistem de operare, ID-ul instalării) nu apărea                                                | ✅ Adăugat; garanția de transfer `[SAFEGUARD]` ⚠️                                                                                                                                        |
| Google ca operator separat; informarea cerută de politica Google privind consimțământul UE                             | Politica Google; art. 26  | Lipsea                                                                                                                   | ✅ Adăugat, cu linkul către politica Google                                                                                                                                              |
| Transferuri în SUA                                                                                                     | art. 45, 46               | `[DPF / SCC]`                                                                                                            | ✅ Decizia de adecvare UE–SUA (menținută de Tribunal la 3 septembrie 2025, cauza T-553/23 Latombe; posibil recurs la CJUE) + clauze contractuale standard; RevenueCat oferă SCC prin DPA |
| Termene de păstrare                                                                                                    | art. 5 alin. (1) lit. e)  | `[N]` peste tot                                                                                                          | ✅ Valori concrete: backup 7 zile, jurnale 7 zile, erori ≤ 90 de zile, statistici 12 luni, asistență 12 luni după rezolvare ⚠️ unele se setează la furnizori                             |
| Termenul de răspuns la cereri                                                                                          | art. 12 alin. (3)         | Pagina de ștergere spunea „în [30] zile”                                                                                 | ✅ „Fără întârzieri nejustificate, cel mult o lună” (+2 luni pentru cereri complexe)                                                                                                     |
| Ștergerea ajunge la toate datele                                                                                       | art. 17                   | Rapoartele de eroare (Sentry) și statisticile (PostHog) poartă ID-ul pseudonim; ștergerea contului nu ajunge la ele      | ✅ Spus onest: expiră la 90 de zile / 12 luni. Opțional: ștergere prin API-urile lor în funcția `delete-account` ⚠️                                                                      |
| Dreptul de acces și drepturile altora                                                                                  | art. 15 alin. (1) și (4)  | „Exportă datele mele” include și raportările depuse **despre** utilizator — motivul și starea, niciodată cine a raportat | ✅ Așa este construit exportul 🔍 avocatul să confirme echilibrul dintre accesul persoanei și protecția celui care raportează                                                            |
| Jurnalele de audit ale autentificării                                                                                  | art. 5, 17                | Supabase poate scrie în baza de date jurnale care păstrează **emailul** după ștergerea contului                          | ⚠️ În producție: Authentication → Audit logs → oprește „Write audit logs to the database” (`docs/DEPLOYMENT.md`)                                                                         |
| Adresele IP în statistici                                                                                              | art. 5 alin. (1) lit. c)  | PostHog poate reține IP-ul                                                                                               | ⚠️ În PostHog: „Discard client IP data” și retenția de 12 luni                                                                                                                           |
| Minorii: fără consimțământ sub 16 ani; drepturile părinților                                                           | art. 8                    | Implementat în aplicație; drepturile părinților nu erau menționate                                                       | ✅ Adăugate; vezi D1                                                                                                                                                                     |

### Viața privată în comunicațiile electronice — Legea nr. 506/2004

| Cerința                                   | Temei            | Acum                                                                                                                                 |
| ----------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Consimțământ pentru accesul la dispozitiv | art. 4 alin. (5) | ✅ Secțiunea nouă „Pe dispozitivul tău”; statisticile și reclamele personalizate — doar cu consimțământ; Sentry și Expo — vezi D2 🔍 |

### Protecția consumatorilor

| Cerința                                                               | Temei                                                                                                 | Ce am găsit                 | Acum                                                                                                                                                                                                                                |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Identitatea și datele comerciantului                                  | Legea nr. 365/2002, art. 5; OUG nr. 34/2014, art. 6                                                   | Doar numele și adresa       | ✅ Plus nr. de înregistrare și CUI (termeni §1, asistență); vezi D4                                                                                                                                                                 |
| Informații despre abonament: preț cu taxe, durată, reînnoire, anulare | OUG nr. 34/2014, art. 6                                                                               | Parțial                     | ✅ Termeni §5 (prețul îl afișează magazinul; aplicația îl arată din Offerings, niciodată scris în cod)                                                                                                                              |
| Dreptul de retragere și pierderea lui pentru conținut digital         | OUG nr. 34/2014, art. 9, art. 16 lit. a) și m)                                                        | Lipsea                      | ✅ Termeni §6 — prin magazin; pierderea doar în condițiile legii                                                                                                                                                                    |
| Garanția legală de conformitate pentru servicii digitale              | OUG nr. 141/2021 (Directiva (UE) 2019/770)                                                            | Lipsea                      | ✅ Termeni §7                                                                                                                                                                                                                       |
| Modificarea serviciului; eliminarea unei funcții plătite              | OUG nr. 141/2021, art. 19                                                                             | `[lawyer to draft]`         | ✅ Termeni §8 — preaviz 30 de zile, încetare gratuită, rambursare — vezi D3 🔍                                                                                                                                                      |
| Fără clauze abuzive (modificare unilaterală, excluderea drepturilor)  | Legea nr. 193/2000                                                                                    | Clauza de modificare lipsea | ✅ Termeni §14 — doar pentru motiv întemeiat, preaviz 30 de zile, drept de încetare                                                                                                                                                 |
| Limitarea răspunderii                                                 | Codul civil, art. 1355                                                                                | `[lawyer to draft]`         | ✅ Termeni §12 — fără limitare pentru intenție, culpă gravă, vătămarea persoanei sau drepturile de consumator                                                                                                                       |
| Legea aplicabilă și instanța competentă                               | Reg. (CE) 593/2008 (Roma I), art. 6; Reg. (UE) 1215/2012, art. 18                                     | `[lawyer to draft]`         | ✅ Termeni §15 — legea română, fără a priva consumatorul de protecția legii țării sale; instanța de la domiciliul lui                                                                                                               |
| Platforma europeană SOL                                               | Reg. (UE) 2024/3228                                                                                   | Placeholder-ul cerea linkul | ✅ **Platforma a fost desființată la 20 iulie 2025** — linkul nu mai trebuie pus                                                                                                                                                    |
| Soluționarea alternativă a litigiilor (SAL) și pictograma ANPC        | OG nr. 38/2015; Ordinul ANPC 449/2022, modificat prin Ordinul 270/2026 (în vigoare de la 19 mai 2026) | Lipsea                      | ✅ Link `reclamatiisal.anpc.ro` în termeni și pe asistență; ⚠️ pictograma oficială SAL de 250 × 50 pe prima pagină a site-ului (de descărcat de pe anpc.ro) 🔍 se aplică unui site care prezintă o aplicație vândută prin magazine? |
| Informații în limba română                                            | Legea nr. 500/2004; OG nr. 21/1992                                                                    | Doar engleză                | ✅ Toate paginile în română; aplicația și listarea trimit la limba utilizatorului                                                                                                                                                   |

### Serviciile digitale — Regulamentul (UE) 2022/2065 (DSA)

Numele afișate în clasament sunt conținut furnizat de utilizatori, deci aplicația găzduiește
informații (serviciu de găzduire). Ca microîntreprindere, ești scutit de obligațiile pentru
platformele online din art. 19–28 și de rapoartele de transparență din art. 15.

| Cerința                                                                      | Temei          | Acum                                                                                                      |
| ---------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------- |
| Termenii descriu moderarea, inclusiv instrumentele automate                  | art. 14        | ✅ Termeni §9 — filtrul automat la alegerea numelui; raportările analizate de o persoană                  |
| Notificări despre conținut ilegal, de la oricine                             | art. 16        | ✅ Butonul de raportare + adresa de email din termeni                                                     |
| Motivarea fiecărei decizii către cel afectat                                 | art. 17        | ✅ Promisă în termeni §9; ⚠️ procedura și modelul de email în `docs/STORE.md`                             |
| Punct unic de contact pentru utilizatori și autorități, cu limbile acceptate | art. 11–12     | ✅ Termeni §9 — română și engleză                                                                         |
| Este afișarea numelor o funcție „minoră și pur auxiliară”?                   | art. 3 lit. i) | 🔍 Dacă da, aplicația nici nu este „platformă online”; oricum, obligațiile de mai sus se aplică găzduirii |

### Altele

| Subiect                                                       | Constatare                                                                                                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Accesibilitate — Legea nr. 232/2022 (Directiva (UE) 2019/882) | ✅ Microîntreprinderile care prestează servicii (sub 10 angajați, cifră de afaceri ≤ 2 mil. EUR) sunt exceptate; aplicația are oricum lucrul din Faza 20 |
| Apple — termeni minimi pentru un EULA propriu                 | ✅ Termeni §16. Dacă folosești EULA standard Apple, secțiunea rămâne fără efect negativ                                                                  |
| Google Play — pagina web de ștergere și politica publică      | ✅ Pagina există în ambele limbi; trebuie doar găzduită                                                                                                  |
| AI Act                                                        | Nu se aplică: aplicația nu folosește inteligență artificială                                                                                             |

---

## 3. Ce rămâne de făcut

În afara deciziilor D1–D4:

1. **Completează marcajele** cu datele PFA: denumirea, adresa, nr. de înregistrare, CUI, adresele
   de email, data intrării în vigoare, termenul de răspuns. `npm run release:check` le numără.
2. **Semnează acordurile de prelucrare (DPA)** cu Supabase, RevenueCat, Expo, Google, PostHog,
   Sentry și furnizorul de email; completează garanția de transfer pentru Expo.
3. **Setări în producție:** Supabase — oprește scrierea jurnalelor de audit în baza de date;
   PostHog — „Discard client IP data” și retenția de 12 luni; Sentry — proiect în regiunea UE,
   retenție ≤ 90 de zile.
4. **Pictograma ANPC SAL** pe prima pagină a site-ului, dacă avocatul confirmă că se aplică.
5. **Procedura de moderare DSA:** când redenumești sau ascunzi pe cineva, îi trimiți motivarea
   (model în `docs/STORE.md`).
6. **Urmărește proiectul L190/2025** în Camera Deputaților — dacă devine lege, D1 devine urgentă.

---

## 4. Surse verificate

- Regulamentul (UE) 2024/3228 — desființarea platformei SOL:
  [eur-lex.europa.eu](https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=OJ:L_202403228)
- Ordinul ANPC 270/2026 (modifică Ordinul 449/2022):
  [juridice.ro](https://www.juridice.ro/824963/anpc-dezvolta-sistemul-sal-potrivit-cadrului-european-actual.html)
- Cauza T-553/23 Latombe — Cadrul UE–SUA menținut:
  [IAPP](https://iapp.org/news/a/european-general-court-dismisses-latombe-challenge-upholds-eu-us-data-privacy-framework)
- Proiectul „Legea majoratului online” (L190/2025) — stadiul:
  [senat.ro](https://www.senat.ro/legis/lista.aspx?nr_cls=L190&an_cls=2025); conținutul:
  [CMS](https://cms.law/en/rou/legal-updates/romania-approves-draft-law-creating-stricter-rules-for-protecting-children-online)
- Vârsta consimțământului digital în România (16 ani):
  [Linklaters](https://www.linklaters.com/en/insights/data-protected/data-protected---romania)
- Legea nr. 232/2022 — excepția pentru microîntreprinderi:
  [juridice.ro](https://www.juridice.ro/791199/obligatii-noi-privind-accesibilitatea-cum-afecteaza-legea-232-2022-operatorii-economici-incepand-cu-28-iunie-2025.html)
- Expo — datele trimise la verificarea actualizărilor:
  [docs.expo.dev](https://docs.expo.dev/eas/observe/reference/client-id/),
  [expo.dev/privacy-explained](https://expo.dev/privacy-explained)
- Supabase — retenția copiilor de siguranță (Pro: 7 zile):
  [supabase.com](https://supabase.com/features/database-backups); jurnalele de audit:
  [supabase.com/docs](https://supabase.com/docs/guides/auth/audit-logs)
- RevenueCat — DPA cu clauze contractuale standard:
  [revenuecat.com/dpa](https://www.revenuecat.com/dpa)
