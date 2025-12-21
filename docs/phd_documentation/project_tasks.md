# ContentPlanner Pro v0.4.0 - Task List

## Sprint 1: Kritikus Javítások ✅
- [x] `handleSaveInvoice` explicit mezőmentés (`fulfillmentDate`, `paymentMethod`)
- [x] Hard-coded magyar szövegek eltávolítása (`InvoicingView.tsx`)
- [x] Fordítási kulcsok hozzáadása (`LanguageContext.tsx`)
- [x] TypeScript strict mód ellenőrzése (már be volt kapcsolva)
- [x] Build teszt (`npm run build` sikeres)
- [x] Verzió-bump 0.3.9 → 0.4.0
- [x] Git commit és push

## Sprint 2: Ajánlott Fejlesztések (I.)
- [ ] Unit tesztek (`handleSaveInvoice`, `DataContext`)
- [ ] Komponens-bontás (`InvoiceForm`, `InvoicePreview`)
- [ ] `useReducer` bevezetése komplex állapotokhoz

## Sprint 3: Ajánlott Fejlesztések (II.)
- [ ] UX javítások (validáció, loading, toast)
- [ ] Keyboard navigáció
- [ ] Lazy loading a nézetekhez

## Sprint 4: Plusz Funkciók
- [ ] PDF export (`react-pdf` vagy `pdfmake`)
- [ ] NAV-szám automatikus generálás
- [ ] PWA manifest

## Sprint 5: Tesztelés & Dokumentáció

- [ ] Integrációs tesztek
- [ ] Lighthouse audit
- [ ] Changelog generálás

## Sprint 6: PhD Pénzügyi Motor (Financial Engine) 🧮
- [x] `FinancialMathService` utility osztály (`src/utils/financialMath.ts`)
- [x] Cash Flow előrejelzés (Lineáris regresszió, mozgóátlag)
- [x] DataContext bővítése (`financialStats` state)
- [x] Kintlévőség kezelés (Invoice integráció)
- [x] Fejlett statisztikai dashboard (`StatisticsView` redesign)
- [x] PhD Refactor: `StorageService` implementálása
- [x] PhD Refactor: `DataContext` optimalizálás
- [x] Verzió-bump 0.4.0 → 0.4.1
