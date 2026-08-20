// Basic interactivity: current year, language switching, and simple form handling
const translations = {
  en: {
    title: 'Law Office — Trusted Legal Counsel',
    siteName: 'Law Office',
    navHome: 'Home',
    navAbout: 'About',
    navServices: 'Practice',
    navLaws: 'Laws',
    navLawyer: 'Portal',
    navTeam: 'Team',
    navContact: 'Contact',
    heroTitle: 'Trusted legal counsel for individuals & businesses',
    heroSubtitle: 'Experienced attorneys focused on results, integrity, and personalized service.',
    heroButton: 'Request Consultation',
    aboutTitle: 'About Our Firm',
    aboutText: 'We provide practical legal solutions in corporate, family, real estate, and litigation matters. Our approach emphasizes clear communication and measurable results.',
    servicesTitle: 'Practice Areas',
    newsTitle: 'Key Legislation of Kazakhstan',
    newsIntro: 'Official texts of laws available in the Adilet legal information system.',
    lawLaborTitle: 'Labour Code of the Republic of Kazakhstan',
    lawLaborText: 'Rules governing employment contracts, working time, leave, and workplace relations.',
    lawBusinessTitle: 'Entrepreneurial Code of the Republic of Kazakhstan',
    lawBusinessText: 'Core rules for business, state regulation, and the protection of entrepreneurs’ rights.',
    lawDataTitle: 'Law on Personal Data and Their Protection',
    lawDataText: 'Requirements for collecting, storing, and processing personal data.',
    lawCivilTitle: 'Civil Code of the Republic of Kazakhstan',
    lawCivilText: 'Fundamental rules on property, obligations, contracts, and civil rights.',
    newsTag1: 'Legislation',
    newsTitle1: 'New digital tax reporting rules',
    newsText1: 'Businesses are encouraged to adapt to the updated reporting process and ensure compliance with new digital standards.',
    newsTag2: 'Judiciary',
    newsTitle2: 'Strengthened protection of business rights',
    newsText2: 'Recent judicial practice highlights faster dispute resolution and clearer protections for commercial contracts.',
    newsTag3: 'Reform',
    newsTitle3: 'Updated regulations for labor relations',
    newsText3: 'New amendments aim to simplify employer obligations and improve transparency in employment agreements.',
    serviceCorporateTitle: 'Corporate Law',
    serviceCorporateText: 'Formation, contract drafting, M&A support, and compliance.',
    serviceLitigationTitle: 'Litigation',
    serviceLitigationText: 'Civil disputes, strategic representation, and trial experience.',
    serviceFamilyTitle: 'Family Law',
    serviceFamilyText: 'Divorce, custody, and mediation with sensitivity and skill.',
    serviceRealEstateTitle: 'Real Estate',
    serviceRealEstateText: 'Transactions, leases, zoning, and title matters.',
    teamTitle: 'Our Team',
    memberJaneName: 'Jane Doe, Esq.',
    memberJaneRole: 'Managing Partner',
    memberJohnName: 'John Smith, Esq.',
    memberJohnRole: 'Senior Counsel',
    contactTitle: 'Contact',
    contactText: 'Fill out the form or email us at ',
    namePlaceholder: 'Your name',
    emailPlaceholder: 'Email',
    messagePlaceholder: 'Brief message',
    submitButton: 'Send',
    formError: 'Please complete all fields.',
    formSuccess: 'Your request has been saved in the system.',
    footerRights: 'All rights reserved.'
  },
  ru: {
    title: 'Юридическая фирма — Надежная правовая поддержка',
    siteName: 'Юридическая фирма',
    navHome: 'Главная',
    navAbout: 'О нас',
    navServices: 'Практика',
    navLaws: 'Законы',
    navLawyer: 'Кабинет',
    navTeam: 'Команда',
    navContact: 'Контакты',
    heroTitle: 'Надежная правовая поддержка для частных лиц и бизнеса',
    heroSubtitle: 'Опытные адвокаты, ориентированные на результат, честность и персональный подход.',
    heroButton: 'Запросить консультацию',
    aboutTitle: 'О нашей фирме',
    aboutText: 'Мы предоставляем практические юридические решения по корпоративным, семейным, вопросам недвижимости и спорам. Наш подход строится на понятной коммуникации и достижении измеримых результатов.',
    servicesTitle: 'Практические направления',
    newsTitle: 'Основные законы Казахстана',
    newsIntro: 'Официальные тексты законов в информационно-правовой системе «Әділет».',
    lawLaborTitle: 'Трудовой кодекс Республики Казахстан',
    lawLaborText: 'Правила трудовых договоров, рабочего времени, отпусков и трудовых отношений.',
    lawBusinessTitle: 'Предпринимательский кодекс Республики Казахстан',
    lawBusinessText: 'Основные нормы для бизнеса, государственного регулирования и защиты прав предпринимателей.',
    lawDataTitle: 'Закон «О персональных данных и их защите»',
    lawDataText: 'Требования к сбору, хранению и обработке персональных данных.',
    lawCivilTitle: 'Гражданский кодекс Республики Казахстан',
    lawCivilText: 'Базовые нормы об имуществе, обязательствах, договорах и гражданских правах.',
    newsTag1: 'Законодательство',
    newsTitle1: 'Новые правила цифровой налоговой отчетности',
    newsText1: 'Бизнесу рекомендуется адаптироваться к обновленному процессу отчетности и соблюдать новые цифровые стандарты.',
    newsTag2: 'Судебная система',
    newsTitle2: 'Усилена защита прав бизнеса',
    newsText2: 'Последняя судебная практика подчеркивает более быстрое разрешение споров и более понятную защиту коммерческих договоров.',
    newsTag3: 'Реформа',
    newsTitle3: 'Обновлены правила трудовых отношений',
    newsText3: 'Новые поправки направлены на упрощение обязанностей работодателей и повышение прозрачности трудовых договоров.',
    serviceCorporateTitle: 'Корпоративное право',
    serviceCorporateText: 'Создание компаний, договоры, сопровождение сделок и соблюдение требований.',
    serviceLitigationTitle: 'Споры',
    serviceLitigationText: 'Гражданские споры, стратегическое представительство и опыт в суде.',
    serviceFamilyTitle: 'Семейное право',
    serviceFamilyText: 'Развод, опека и медиация с деликатностью и профессионализмом.',
    serviceRealEstateTitle: 'Недвижимость',
    serviceRealEstateText: 'Сделки, аренда, zoning и вопросы титула.',
    teamTitle: 'Наша команда',
    memberJaneName: 'Джейн Доу, Esq.',
    memberJaneRole: 'Управляющий партнер',
    memberJohnName: 'Джон Смит, Esq.',
    memberJohnRole: 'Старший советник',
    contactTitle: 'Контакты',
    contactText: 'Заполните форму или напишите нам на ',
    namePlaceholder: 'Ваше имя',
    emailPlaceholder: 'Эл. почта',
    messagePlaceholder: 'Краткое сообщение',
    submitButton: 'Отправить',
    formError: 'Пожалуйста, заполните все поля.',
    formSuccess: 'Обращение сохранено в системе.',
    footerRights: 'Все права защищены.'
  },
  kk: {
    title: 'Заң фирмасы — Сенімді құқықтық қолдау',
    siteName: 'Заң фирмасы',
    navHome: 'Басты',
    navAbout: 'Біз туралы',
    navServices: 'Практика',
    navLaws: 'Заңдар',
    navLawyer: 'Кабинет',
    navTeam: 'Команда',
    navContact: 'Байланыс',
    heroTitle: 'Жеке тұлғалар мен бизнес үшін сенімді құқықтық қолдау',
    heroSubtitle: 'Нәтижеге, адалдыққа және жеке тәсілге бағытталған тәжірибелі адвокаттар.',
    heroButton: 'Кеңес алу',
    aboutTitle: 'Біздің фирма туралы',
    aboutText: 'Біз корпоративтік, отбасылық, жылжымайтын мүлік және даулы мәселелер бойынша практикалық құқықтық шешімдер ұсынамыз. Біздің тәсіл түсінікті коммуникация мен өлшенетін нәтижеға негізделген.',
    servicesTitle: 'Практикалық бағыттар',
    newsTitle: 'Қазақстанның негізгі заңдары',
    newsIntro: '«Әділет» ақпараттық-құқықтық жүйесіндегі заңдардың ресми мәтіндері.',
    lawLaborTitle: 'Қазақстан Республикасының Еңбек кодексі',
    lawLaborText: 'Еңбек шарттары, жұмыс уақыты, демалыс және еңбек қатынастары туралы нормалар.',
    lawBusinessTitle: 'Қазақстан Республикасының Кәсіпкерлік кодексі',
    lawBusinessText: 'Бизнес, мемлекеттік реттеу және кәсіпкерлердің құқықтарын қорғаудың негізгі нормалары.',
    lawDataTitle: 'Дербес деректер және оларды қорғау туралы заң',
    lawDataText: 'Дербес деректерді жинау, сақтау және өңдеу талаптары.',
    lawCivilTitle: 'Қазақстан Республикасының Азаматтық кодексі',
    lawCivilText: 'Мүлік, міндеттемелер, шарттар және азаматтық құқықтар туралы негізгі нормалар.',
    newsTag1: 'Заңнама',
    newsTitle1: 'Салықтың жаңа цифрлық есептілік ережелері',
    newsText1: 'Бизнеске жаңартылған есептілік процесіне бейімделіп, жаңа цифрлық стандарттарға сәйкестікті қамтамасыз ету ұсынылады.',
    newsTag2: 'Сот жүйесі',
    newsTitle2: 'Бизнес құқықтарын қорғау күшейтілді',
    newsText2: 'Соңғы сот тәжірибесі мәмілелердің тезірек шешілуін және коммерциялық келісімшарттардың анықтылығын көрсетеді.',
    newsTag3: 'Реформа',
    newsTitle3: 'Еңбек қатынастарының ережелері жаңартылды',
    newsText3: 'Жаңа өзгерістер жұмыс берушінің міндеттерін жеңілдетуге және еңбек шарттарының ашықтығын арттыруға бағытталған.',
    serviceCorporateTitle: 'Корпоративтік құқық',
    serviceCorporateText: 'Компания құру, шарттар, мәмілелерді begeleiding және талаптарды сақтау.',
    serviceLitigationTitle: 'Даулар',
    serviceLitigationText: 'Азаматтық даулар, стратегиялы құқықтық өкілдік және сот тәжірибесі.',
    serviceFamilyTitle: 'Отбасылық құқық',
    serviceFamilyText: 'Ажырасу, қамқорлық және медиация нәзік әрі кәсіби түрде.',
    serviceRealEstateTitle: 'Жылжымайтын мүлік',
    serviceRealEstateText: 'Мәмілелер, жалдау, zoning және титул мәселелері.',
    teamTitle: 'Біздің команда',
    memberJaneName: 'Джейн Доу, Esq.',
    memberJaneRole: 'Бас партнер',
    memberJohnName: 'Джон Смит, Esq.',
    memberJohnRole: 'Аға кеңесші',
    contactTitle: 'Байланыс',
    contactText: 'Форманы толтырыңыз немесе бізге мына мекенжайға жазыңыз: ',
    namePlaceholder: 'Сіздің атыңыз',
    emailPlaceholder: 'Электрондық пошта',
    messagePlaceholder: 'Қысқа хабар',
    submitButton: 'Жіберу',
    formError: 'Барлық полдерді толтырыңыз.',
    formSuccess: 'Рахмет — хабар жіберілді (демо).',
    footerRights: 'Барлық құқықтар қорғалған.'
  }
};

document.addEventListener('DOMContentLoaded', function () {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  const form = document.getElementById('contactForm');
  const msg = document.getElementById('formMessage');
  const langButtons = document.querySelectorAll('.lang-btn');
  const textElements = document.querySelectorAll('[data-i18n]');
  const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  let currentLang = localStorage.getItem('siteLang') || document.documentElement.lang || 'ru';

  function applyLanguage(lang) {
    localStorage.setItem('siteLang', lang);
    currentLang = lang;
    document.documentElement.lang = lang;
    document.title = translations[lang].title;

    textElements.forEach(function (el) {
      const key = el.getAttribute('data-i18n');
      if (translations[lang][key]) {
        el.textContent = translations[lang][key];
      }
    });

    placeholderElements.forEach(function (el) {
      const key = el.getAttribute('data-i18n-placeholder');
      if (translations[lang][key]) {
        el.setAttribute('placeholder', translations[lang][key]);
      }
    });

    langButtons.forEach(function (btn) {
      const active = btn.getAttribute('data-lang') === lang;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  if (form) {
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      const name = form.name.value.trim();
      const email = form.email.value.trim();
      const message = form.message.value.trim();
      if (!name || !email || !message) {
        if (msg) {
          msg.textContent = translations[currentLang].formError;
          msg.style.color = 'crimson';
        }
        return;
      }
      try {
        const response = await fetch('/api/contacts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, email, message }),
        });
        if (!response.ok) throw new Error('Contact request failed');
        if (msg) {
          msg.style.color = 'green';
          msg.textContent = translations[currentLang].formSuccess;
        }
        form.reset();
      } catch (err) {
        if (msg) {
          msg.style.color = 'crimson';
          msg.textContent = 'Ошибка отправки. Попробуйте позже.';
        }
      }
    });
  }

  langButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      applyLanguage(btn.getAttribute('data-lang'));
    });
  });

  applyLanguage(currentLang);
});
