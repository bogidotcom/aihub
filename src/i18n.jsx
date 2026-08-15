import { createContext, useContext, useState, useCallback } from 'react'

const DICTS = {
  en: {
    greet: { morning: 'Good Morning', afternoon: 'Good Afternoon', evening: 'Good Evening', night: 'Hello, Night Owl' },
    nav: { home: 'Home', events: 'Events', vibecoding: 'Vibe-Coding', development: 'Development', contact: 'Contact', blog: 'Blog', openApp: 'Open App' },
    hero: {
      explorer: 'Explorer', l1: 'Build', l2: 'with AI,', l3: 'Shape Kyrgyzstan',
      sub: 'Join Kyrgyzstan\'s AI community. Learn vibe-coding, attend events, and ship products with cutting-edge intelligence.',
      explore: 'Explore Now', learnMore: 'Learn More',
      cardTitle: 'AI Hub Kyrgyzstan', cardSub: 'Where innovation meets community', fig: '',
    },
    land: {
      events: { title: 'Events & Community', sub: '', points: ['Meetups', 'Workshops', 'Hackathons', 'Community dinners & talks'], cta: 'See the Calendar' },
      classes: { title: 'Vibe-Coding & Blockchain Classes', sub: 'Flow-state programming in the open air — learn to build with calm focus.', points: ['Beginner to advanced tracks', 'Outdoor pair-programming', 'AI-assisted workflows', 'Weekend demo nights'], cta: 'Enroll Now' },
      development: { title: 'Development', sub: 'Product engineering for tomorrow — from first idea to shipped software.', points: ['Custom development', 'AI integration', 'Consulting & audits', 'MVP in weeks, not months'], cta: 'Start a Project' },
      yoga: { title: 'Yoga & Time Offline', sub: 'Balance the build with sunrise flows, meditation and real disconnection.', points: ['Sunrise yoga sessions', 'Guided meditation', 'Forest walks & cold dips', 'Screen-free weekends'], cta: 'Book a Class' },
    },
    contact: {
      label: 'contact', title: 'Get in Touch', sub: 'Join our community of innovators and makers',
      name: 'Your Name', emailTg: 'Email or Telegram', subject: 'Subject', message: 'Your Message',
      send: 'Send Message', sending: 'Sending…', sentTitle: 'Message sent!', sentSub: "We'll get back to you soon.", error: 'Something went wrong — try again.',
    },
    footer: { tagline: 'Build with AI. Shape Kyrgyzstan\'s tech future.', learn: 'Learn', business: 'Business', connect: 'Connect', gifts: 'Gift cards', rights: '© 2026 AIHub — built with intention. no fluff, just flow.' },
    tabs: { learn: 'Learn', work: 'Work', blog: 'Blog', events: 'Events', gifts: 'Gift cards' },
    shell: {
      guest: 'guest', guestHint: 'guest — log in via events or Telegram',
      login: 'Log in', loginPrompt: 'Log in with Telegram to continue', openBot: 'or open @{bot} in Telegram →',
      logout: 'Log out', myClasses: '🎓 My classes', myGifts: '🎁 Gift cards',
    },
    events: {
      title: 'Events', upcoming: 'upcoming', past: 'past',
      noneUpcoming: 'No upcoming events yet — check back soon!', nonePast: 'No past events.',
      from: 'from', free: 'Free', freeEntry: 'Free entry', all: 'All events', tickets: 'Tickets',
      left: '{n} left', soldOut: 'SOLD OUT', buy: 'Buy', rsvp: 'RSVP', quantity: 'Quantity',
      yourName: 'Your name', contactPh: 'Email or Telegram (for the ticket)',
      continuePay: 'Continue to payment', getTicket: 'Get ticket', creating: 'Creating order…',
      notFound: 'Event not found.', checkoutFail: 'Checkout failed, try again.', soldOutMsg: 'Sold out — sorry!',
    },
    invoice: {
      order: 'order', expiresIn: 'expires in', exact: 'Send the exact amount — it identifies your order.',
      payConnected: 'Pay with connected wallet', connect: 'Connect @wallet / TON wallet', opening: 'Opening wallet…',
      connected: 'connected', disconnect: 'disconnect', orManual: 'or transfer manually',
      addrLabel: 'USDT · TON network', amountLabel: 'Amount (exact)', commentLabel: 'Comment (optional but helpful)',
      auto: 'Confirmation is automatic — usually under a minute after the transfer lands.',
      other: 'Other networks (TRC20 · Solana · ERC20)',
      otherNote: 'Send the exact amount, then paste the transaction hash — we verify it manually.',
      txHash: 'Transaction hash', submitHash: "I've paid — submit hash",
      payFail: 'Could not start the transfer — you can still pay manually below.', hashFail: 'Could not submit the hash.',
      confirmed: 'Payment confirmed!', yourTickets: 'Your tickets', yourTicket: 'Your ticket', ticketN: '🎟 Ticket {n} — view & QR',
      giftCode: 'Gift card code', giftNote: 'Also sent to you in Telegram. The recipient redeems it in the app or at the hub.',
      bookFirst: 'Book your first class →',
      expired: 'Order expired', expiredSub: 'Start a new checkout — payments must arrive within 30 minutes.',
      rejected: 'Payment could not be verified', rejectedSub: "Message the bot and we'll sort it out.",
      review: 'Payment under review', reviewSub: "We're checking your transaction — you'll get a Telegram message once it's confirmed.",
      copy: 'tap to copy',
    },
    ticket: { valid: 'valid', checkedIn: 'checked in', notFound: 'Ticket not found.' },
    yoga: {
      title: 'Yoga & Time Offline', yourClasses: 'your classes', schedule: 'Sunrise 8 AM · Sunset 8 PM',
      loginSee: 'Log in to see your package →', classesLeft: 'classes left', pkgOf: "{name}'s package",
      bookClass: 'Book a class', book: 'Book class', booked: '✅ Booked — {date} {slot}', paySpotTag: 'pay on the spot',
      classesLeftN: '{n} classes left', alreadyBooked: 'You already booked this slot 🙂', failed: 'Booking failed — try again.',
      upcoming: 'Upcoming', fromPackage: 'package', paySpot: 'pay on spot', packages: 'Packages',
      gifts: 'Gift cards', redeem: 'Redeem', buyGiftLink: 'Buy a gift card for someone →',
      noLeft: 'No classes left', noLeftSub: 'Your package is used up — pick a new one, or pay for this class at the studio.',
      buy: 'Buy', payOnSpot: "I'll pay on the spot", cls: 'classes', cls1: 'class',
      sunrise: 'Sunrise', sunset: 'Sunset',
      redeemed: '🎁 Gift redeemed — {n} classes added!', redeemedAlready: 'This gift card was already redeemed.', badCode: 'Invalid gift code.',
      loginPrompt: 'Log in with Telegram to book classes and buy packages',
      pkg: { test: '1 class', p4: '4 classes', p8: '8 classes', p12: '12 classes' },
    },
    learn: {
      title: 'Vibe-Coding School',
      intro: 'Not about learning to code — about {b} — automating your workflow, thinking AI-native, and shipping products where AI does the heavy lifting.',
      introB: 'vibe-coding IT businesses',
      enroll: 'Enroll now', allPrograms: 'All programs', roadmap: 'The roadmap', teaching: 'Who is teaching',
      applyFor: 'Apply for {title}', apply: 'Apply', applied: 'Application sent!', appliedSub: "We'll message you to schedule your start.",
      contactPh: 'Telegram @username or phone', sending: 'Sending…', error: 'Failed — try again.',
      giftLink: 'Gift a program to someone →',
      prog: {
        tryout: { title: 'Try it out', format: 'Group · RU/ENG', duration: '1 month', schedule: '3 classes a week · 2 hours per class', perks: ['AI-native thinking foundations', 'Automate your own workflow', 'Group flow sessions'] },
        resident: { title: 'Resident', format: 'Group · RU/ENG', duration: '3 months', schedule: '3 classes a week · 2 hours per class', perks: ['Everything in Try it out', 'Commercial project access — get real clients', 'Portfolio + delivery experience'] },
        individual: { title: 'Individual', format: '1-on-1 · any language', duration: 'Any schedule, idea and load', schedule: 'Per 2 hour session', perks: ['Your idea, your pace', 'Custom curriculum', 'Direct mentorship'] },
      },
      steps: [
        { title: 'Mindset', desc: "AI-native thinking — what vibe-coding is and why it's about businesses, not syntax." },
        { title: 'Tooling', desc: 'Claude, Cursor, agents. Prompts as specifications, AI as your senior engineer.' },
        { title: 'Automate', desc: 'Ship a real automation for your own daily workflow — your first win.' },
        { title: 'Build', desc: 'MVP of an IT product or business with AI doing the heavy lifting.' },
        { title: 'Launch', desc: 'Clients, pricing, delivery. Residents get access to real commercial projects.' },
      ],
      teacher: {
        role: 'CEO · Technical Leader · Product Architect',
        stats: [['8 yrs', 'Web3 & AI'], ['20+', 'Team led'], ['10+', 'Products shipped']],
        timeline: [
          ['2026 — now', 'POH Network — founder. Decentralized AI compute network.'],
          ['2022 — 2025', 'Assetux — founder. DEX aggregator, BTC on TON, DePIN VPN.'],
          ['2020 — 2023', 'Assetux Development — Web3 outsourcing, 10+ global clients, 20+ team.'],
          ['2021 — 2022', 'Entangle.fi — idea → architecture → whitepaper → MVP → fundraising.'],
        ],
      },
    },
    work: {
      title: 'Development', sub: 'Product engineering for tomorrow — MVP in weeks, not months.',
      services: [
        { title: 'Custom Development', desc: 'Web, bots, mini-apps, blockchain — from first idea to shipped software.' },
        { title: 'AI Integration', desc: 'Automations, agents and AI-native workflows inside your business.' },
        { title: 'Consulting & Audits', desc: 'Architecture, product strategy, code and security review.' },
      ],
      getInTouch: 'Get in touch', namePh: 'Your name', contactPh: 'Email or Telegram', projectPh: 'Tell us about your project',
      send: 'Send', sending: 'Sending…', sent: 'Message sent!', sentSub: "We'll get back to you in Telegram shortly.", error: 'Failed — try again.',
    },
    gifts: {
      title: 'Gift Cards', sub: 'Gift a class package, a vibe-coding program, or any amount. Paid like a ticket — the code arrives instantly.',
      yoga: '🎓 Class package', vibecoding: '🧑‍💻 Vibe-coding', custom: '💸 Custom amount',
      amount: 'Amount (USDT)', yourName: 'Your name', contactPh: 'Email or Telegram (to receive the code)',
      total: 'Total', continue: 'Continue to payment', creating: 'Creating order…', error: 'Checkout failed — check the fields and try again.',
    },
    blog: { title: 'Blog', none: 'No posts yet', dropHint: 'drop .md files into content/blog/', loading: 'loading posts', loadingPost: 'loading post', all: 'All posts', notFound: 'Post not found.', back: '← Back to blog' },
    common: { loading: 'loading', usdt: 'USDT', kgs: 'KGS', approx: '≈' },
  },

  ru: {
    greet: { morning: 'Доброе утро', afternoon: 'Добрый день', evening: 'Добрый вечер', night: 'Привет, полуночник' },
    nav: { home: 'Главная', events: 'События', vibecoding: 'Вайб-кодинг', development: 'Разработка', contact: 'Контакты', blog: 'Блог', openApp: 'Открыть приложение' },
    hero: {
      explorer: 'исследователь', l1: 'Создавай', l2: 'с AI,', l3: 'меняй Кыргызстан',
      sub: 'Присоединяйся к AI-сообществу Кыргызстана. Учись вайб-кодингу, посещай события и создавай цифровые бизнесы с помощью искусственного интеллекта.',
      explore: 'Начать', learnMore: 'Подробнее',
      cardTitle: 'AI Hub Кыргызстан', cardSub: 'Где инновации встречаются с сообществом', fig: '',
    },
    land: {
      events: { title: 'События и сообщество', sub: '', points: ['Митапы', 'Воркшопы', 'Хакатоны', 'Комьюнити-ужины и разговоры'], cta: 'Календарь событий' },
      classes: { title: 'Классы вайб-кодинга и блокчейна', sub: 'Программирование в состоянии потока на свежем воздухе — учись создавать со спокойным фокусом.', points: ['От новичка до продвинутого', 'Парное программирование на улице', 'AI-воркфлоу', 'Демо-вечера по выходным'], cta: 'Записаться' },
      development: { title: 'Разработка', sub: 'Продуктовая инженерия будущего — от первой идеи до готового софта.', points: ['Заказная разработка', 'Интеграция AI', 'Консалтинг и аудиты', 'MVP за недели, а не месяцы'], cta: 'Начать проект' },
      yoga: { title: 'Йога и время офлайн', sub: 'Баланс к работе: рассветные практики, медитация и настоящее отключение.', points: ['Йога на рассвете', 'Медитации с проводником', 'Прогулки по лесу и купания', 'Выходные без экранов'], cta: 'Записаться на класс' },
    },
    contact: {
      label: 'контакты', title: 'Свяжитесь с нами', sub: 'Присоединяйтесь к сообществу инноваторов и создателей',
      name: 'Ваше имя', emailTg: 'Email или Telegram', subject: 'Тема', message: 'Ваше сообщение',
      send: 'Отправить', sending: 'Отправка…', sentTitle: 'Сообщение отправлено!', sentSub: 'Мы скоро свяжемся с вами.', error: 'Что-то пошло не так — попробуйте ещё раз.',
    },
    footer: { tagline: 'Создавай с AI. Меняй будущее технологий Кыргызстана.', learn: 'Обучение', business: 'Бизнес', connect: 'Связь', gifts: 'Подарочные карты', rights: '© 2026 AIHub — сделано с намерением. без воды, только поток.' },
    tabs: { learn: 'Учёба', work: 'Работа', blog: 'Блог', events: 'События', gifts: 'Подарочные карты' },
    shell: {
      guest: 'гость', guestHint: 'гость — войдите через события или Telegram',
      login: 'Войти', loginPrompt: 'Войдите через Telegram, чтобы продолжить', openBot: 'или откройте @{bot} в Telegram →',
      logout: 'Выйти', myClasses: '🎓 Мои классы', myGifts: '🎁 Подарочные карты',
    },
    events: {
      title: 'События', upcoming: 'скоро', past: 'прошли',
      noneUpcoming: 'Пока нет предстоящих событий — загляните позже!', nonePast: 'Прошедших событий нет.',
      from: 'от', free: 'Бесплатно', freeEntry: 'Вход свободный', all: 'Все события', tickets: 'Билеты',
      left: 'осталось {n}', soldOut: 'РАСПРОДАНО', buy: 'Купить', rsvp: 'Записаться', quantity: 'Количество',
      yourName: 'Ваше имя', contactPh: 'Email или Telegram (для билета)',
      continuePay: 'Перейти к оплате', getTicket: 'Получить билет', creating: 'Создаём заказ…',
      notFound: 'Событие не найдено.', checkoutFail: 'Не удалось оформить заказ, попробуйте ещё раз.', soldOutMsg: 'Распродано — увы!',
    },
    invoice: {
      order: 'заказ', expiresIn: 'истекает через', exact: 'Отправьте точную сумму — она идентифицирует ваш заказ.',
      payConnected: 'Оплатить подключённым кошельком', connect: 'Подключить @wallet / TON-кошелёк', opening: 'Открываем кошелёк…',
      connected: 'подключен', disconnect: 'отключить', orManual: 'или переведите вручную',
      addrLabel: 'USDT · сеть TON', amountLabel: 'Сумма (точная)', commentLabel: 'Комментарий (необязательно, но полезно)',
      auto: 'Подтверждение автоматическое — обычно меньше минуты после поступления перевода.',
      other: 'Другие сети (TRC20 · Solana · ERC20)',
      otherNote: 'Отправьте точную сумму и вставьте хеш транзакции — мы проверим вручную.',
      txHash: 'Хеш транзакции', submitHash: 'Я оплатил — отправить хеш',
      payFail: 'Не удалось начать перевод — можно оплатить вручную ниже.', hashFail: 'Не удалось отправить хеш.',
      confirmed: 'Оплата подтверждена!', yourTickets: 'Ваши билеты', yourTicket: 'Ваш билет', ticketN: '🎟 Билет {n} — открыть с QR',
      giftCode: 'Код подарочной карты', giftNote: 'Также отправлен вам в Telegram. Получатель активирует его в приложении или в хабе.',
      bookFirst: 'Записаться на первый класс →',
      expired: 'Заказ истёк', expiredSub: 'Начните оформление заново — оплата должна поступить в течение 30 минут.',
      rejected: 'Не удалось подтвердить оплату', rejectedSub: 'Напишите боту — мы разберёмся.',
      review: 'Оплата на проверке', reviewSub: 'Проверяем вашу транзакцию — вы получите сообщение в Telegram после подтверждения.',
      copy: 'нажмите, чтобы скопировать',
    },
    ticket: { valid: 'действителен', checkedIn: 'использован', notFound: 'Билет не найден.' },
    yoga: {
      title: 'Йога и время офлайн', yourClasses: 'ваши занятия', schedule: 'Рассвет 8:00 · Закат 20:00',
      loginSee: 'Войдите, чтобы увидеть свой пакет →', classesLeft: 'осталось занятий', pkgOf: 'пакет {name}',
      bookClass: 'Записаться на класс', book: 'Записаться', booked: '✅ Записаны — {date} {slot}', paySpotTag: 'оплата на месте',
      classesLeftN: 'осталось занятий: {n}', alreadyBooked: 'Вы уже записаны на это время 🙂', failed: 'Не удалось записаться — попробуйте ещё раз.',
      upcoming: 'Ближайшие', fromPackage: 'пакет', paySpot: 'оплата на месте', packages: 'Пакеты',
      gifts: 'Подарочные карты', redeem: 'Активировать', buyGiftLink: 'Купить подарочную карту →',
      noLeft: 'Занятия закончились', noLeftSub: 'Пакет израсходован — выберите новый или оплатите занятие на месте.',
      buy: 'Купить', payOnSpot: 'Оплачу на месте', cls: 'занятий', cls1: 'занятие',
      sunrise: 'Рассвет', sunset: 'Закат',
      redeemed: '🎁 Подарок активирован — добавлено занятий: {n}!', redeemedAlready: 'Эта карта уже активирована.', badCode: 'Неверный код.',
      loginPrompt: 'Войдите через Telegram, чтобы записываться и покупать пакеты',
      pkg: { test: '1 занятие', p4: '4 занятия', p8: '8 занятий', p12: '12 занятий' },
    },
    learn: {
      title: 'Школа вайб-кодинга',
      intro: 'Это не про изучение кода — это про {b}: автоматизацию процессов, AI-native мышление и продукты, где AI делает тяжёлую работу.',
      introB: 'вайб-кодинг IT-бизнесов',
      enroll: 'Записаться', allPrograms: 'Все программы', roadmap: 'Дорожная карта', teaching: 'Кто преподаёт',
      applyFor: 'Заявка на «{title}»', apply: 'Подать заявку', applied: 'Заявка отправлена!', appliedSub: 'Мы напишем вам, чтобы согласовать старт.',
      contactPh: 'Telegram @username или телефон', sending: 'Отправка…', error: 'Ошибка — попробуйте ещё раз.',
      giftLink: 'Подарить программу →',
      prog: {
        tryout: { title: 'Попробовать', format: 'Группа · RU/ENG', duration: '1 месяц', schedule: '3 занятия в неделю · 2 часа', perks: ['Основы AI-native мышления', 'Автоматизация своего воркфлоу', 'Групповые сессии в потоке'] },
        resident: { title: 'Резидент', format: 'Группа · RU/ENG', duration: '3 месяца', schedule: '3 занятия в неделю · 2 часа', perks: ['Всё из «Попробовать»', 'Доступ к коммерческим проектам — реальные клиенты', 'Портфолио + опыт поставки'] },
        individual: { title: 'Индивидуально', format: '1-на-1 · любой язык', duration: 'Любой график, идея и нагрузка', schedule: 'За 1 час занятия', perks: ['Ваша идея, ваш темп', 'Индивидуальная программа', 'Прямое менторство'] },
      },
      steps: [
        { title: 'Мышление', desc: 'AI-native мышление — что такое вайб-кодинг и почему это про бизнес, а не синтаксис.' },
        { title: 'Инструменты', desc: 'Claude, Cursor, агенты. Промпты как спецификации, AI как ваш сеньор-инженер.' },
        { title: 'Автоматизация', desc: 'Реальная автоматизация вашего ежедневного воркфлоу — первая победа.' },
        { title: 'Продукт', desc: 'MVP IT-продукта или бизнеса, где AI делает тяжёлую работу.' },
        { title: 'Запуск', desc: 'Клиенты, цены, поставка. Резиденты получают доступ к реальным коммерческим проектам.' },
      ],
      teacher: {
        role: 'CEO · Технический лидер · Продуктовый архитектор',
        stats: [['8 лет', 'Web3 и AI'], ['20+', 'человек в команде'], ['10+', 'продуктов запущено']],
        timeline: [
          ['2026 — сейчас', 'POH Network — фаундер. Децентрализованная сеть AI-вычислений.'],
          ['2022 — 2025', 'Assetux — фаундер. DEX-агрегатор, BTC на TON, DePIN VPN.'],
          ['2020 — 2023', 'Assetux Development — Web3-аутсорс, 10+ мировых клиентов, команда 20+.'],
          ['2021 — 2022', 'Entangle.fi — идея → архитектура → whitepaper → MVP → фандрайзинг.'],
        ],
      },
    },
    work: {
      title: 'Разработка', sub: 'Продуктовая инженерия будущего — MVP за недели, а не месяцы.',
      services: [
        { title: 'Заказная разработка', desc: 'Веб, боты, мини-аппы, блокчейн — от идеи до готового софта.' },
        { title: 'Интеграция AI', desc: 'Автоматизации, агенты и AI-native процессы внутри вашего бизнеса.' },
        { title: 'Консалтинг и аудиты', desc: 'Архитектура, продуктовая стратегия, ревью кода и безопасности.' },
      ],
      getInTouch: 'Связаться', namePh: 'Ваше имя', contactPh: 'Email или Telegram', projectPh: 'Расскажите о вашем проекте',
      send: 'Отправить', sending: 'Отправка…', sent: 'Сообщение отправлено!', sentSub: 'Скоро ответим вам в Telegram.', error: 'Ошибка — попробуйте ещё раз.',
    },
    gifts: {
      title: 'Подарочные карты', sub: 'Подарите пакет класса, программу вайб-кодинга или любую сумму. Оплата как за билет — код приходит мгновенно.',
      yoga: '🎓 Пакет класса', vibecoding: '🧑‍💻 Вайб-кодинг', custom: '💸 Своя сумма',
      amount: 'Сумма (USDT)', yourName: 'Ваше имя', contactPh: 'Email или Telegram (для получения кода)',
      total: 'Итого', continue: 'Перейти к оплате', creating: 'Создаём заказ…', error: 'Не удалось оформить — проверьте поля и попробуйте ещё раз.',
    },
    blog: { title: 'Блог', none: 'Пока нет постов', dropHint: 'положите .md файлы в content/blog/', loading: 'загрузка постов', loadingPost: 'загрузка поста', all: 'Все посты', notFound: 'Пост не найден.', back: '← Назад в блог' },
    common: { loading: 'загрузка', usdt: 'USDT', kgs: 'KGS', approx: '≈' },
  },

  ky: {
    greet: { morning: 'Сайын аман', afternoon: 'Сайын аман', evening: 'Сайын аман', night: 'Саламатсыз, түндүк уйку' },
    nav: { home: 'Башы', events: 'Иш-чаралар', vibecoding: 'Vibe-Coding', development: 'Өнүктүрүү', contact: 'Байланыш', blog: 'Блог', openApp: 'Приложенияны ачуу' },
    hero: {
      explorer: 'Изилдөөчү', l1: 'Куруу', l2: 'AI менен,', l3: 'Кыргызстанды өзгөр',
      sub: 'Кыргызстандын AI-айкоолуна катышыңыз. Vibe-coding үйрөнүңүз, иш-чараларга катышыңыз жана жасалма интеллект менен товарларды берилишке түштүңүз.',
      explore: 'Баштоо', learnMore: 'Кеңири',
      cardTitle: 'AI Hub Кыргызстан', cardSub: 'Инновация айкоолунун менен жолукуу', fig: '',
    },
    land: {
      events: { title: 'Иш-чаралар жана айкоолу', sub: '', points: ['Митапс', 'Семинарлар', 'Хакатон', 'Айкоолу тамактар жана төлкөлөр'], cta: 'Жолугушуу' },
      classes: { title: 'Vibe-Coding жана Blockchain окуу', sub: 'Агымдагы абалда программалоо - ачык аба туш. Салкын фокус менен жасалуу үйрөнүңүз.', points: ['Башталгычтан озот табылса чейин', 'Жупт программалоо', 'AI иш агымы', 'Демо кечелери'], cta: 'Катталуу' },
      development: { title: 'Өнүктүрүү', sub: 'Келечектин товар инженериясы - биринчи идея менен жүргүзүлгөн программа чейин.', points: ['Урдун өнүктүрүү', 'AI интеграциясы', 'Консультация жана аудит', 'MVP аптасында, айда эмес'], cta: 'Долоо баштоо' },
    },
    contact: {
      label: 'байланыш', title: 'Биз менен байланышыңыз', sub: 'Инноватордор жана чыгуучулардын айкоолуна катышыңыз',
      name: 'Сиздин аты', emailTg: 'Email же Telegram', subject: 'Тема', message: 'Сиздин билдирүүсү',
      send: 'Жөнөтүү', sending: 'Жөнөтүүдө…', sentTitle: 'Билдирүү жөнөтүлдү!', sentSub: 'Түндө сизге байланышабыз.', error: 'Эмне дыр бир болду - кайра аракет кылыңыз.',
    },
    footer: { tagline: 'AI менен куруу. Кыргызстандын технология келечегин өзгөр.', learn: 'Окутуу', business: 'Бизнес', connect: 'Байланыш', gifts: 'Сыйлык карталар', rights: '© 2026 AIHub — максат менен жасалды.' },
    tabs: { learn: 'Окутуу', work: 'Жумушу', blog: 'Блог', events: 'Иш-чаралар', gifts: 'Сыйлык карталар' },
    shell: { guest: 'конок', guestHint: 'конок — иш-чаралар же Telegram аркылуу киргиле', login: 'Кирүү', loginPrompt: 'Улантуу үчүн Telegram аркылуу киргиле', openBot: 'же @{bot} Telegram ачыңыз →', logout: 'Чыгуу', myClasses: '🎓 Менин класстарым', myGifts: '🎁 Сыйлык карталар' },
    yoga: {
      title: 'Класс жана Офлайн убакыт', yourClasses: 'сиздин класстарыңыз', schedule: 'Тангы 8:00 · Кеч 20:00',
      loginSee: 'Класстарды көрүү үчүн киргиле →', classesLeft: 'калган класстар', pkgOf: '{name} пакети',
      bookClass: 'Класс брондоо', book: 'Брондоо', booked: '✅ Брондоңуз — {date} {slot}', paySpotTag: 'жайында төлөө',
      classesLeftN: '{n} класс калды', alreadyBooked: 'Бул убакытта сиз мурун брондонусуз 🙂', failed: 'Брондоо сиздеги болбоду — кайра аракет кылыңыз.',
      upcoming: 'Келечектеги', fromPackage: 'пакет', paySpot: 'жайында төлөө', packages: 'Пакеттер',
      gifts: 'Сыйлык карталар', redeem: 'Активдөө', buyGiftLink: 'Сыйлык карта сатып алуу →',
      noLeft: 'Класстар аяккан', noLeftSub: 'Пакет бүттү — жаңы сатып алыңыз же жерде төлөө.',
      buy: 'Сатып алуу', payOnSpot: 'Жерде төлөө', cls: 'класс', cls1: 'класс',
      sunrise: 'Тангы', sunset: 'Кеч',
      redeemed: '🎁 Сыйлык активдөөнүп — {n} класс кошулду', redeemedAlready: 'Бул карта мурун активдөөнүп.', badCode: 'Жаман код.',
      loginPrompt: 'Класс брондоо жана пакет сатып алуу үчүн Telegram аркылуу киргиле',
      pkg: { test: '1 класс', p4: '4 класс', p8: '8 класс', p12: '12 класс' },
    },
    common: { loading: 'жүктөлүүдө', usdt: 'USDT', kgs: 'KGS', approx: '≈' },
  },

  zh: {
    greet: { morning: '早上好', afternoon: '下午好', evening: '晚上好', night: '晚安，夜猫子' },
    nav: { home: '首页', events: '活动', vibecoding: '代码振动', development: '开发', contact: '联系', blog: '博客', openApp: '打开应用' },
    hero: {
      explorer: '探险家', l1: '用AI', l2: '构建,', l3: '改变吉尔吉斯斯坦',
      sub: '加入吉尔吉斯斯坦的AI社区。学习代码振动，参加活动，用人工智能创建产品。',
      explore: '开始', learnMore: '了解更多',
      cardTitle: 'AI Hub 吉尔吉斯斯坦', cardSub: '创新与社区相遇的地方', fig: '',
    },
    land: {
      events: { title: '活动与社区', sub: '', points: ['聚会', '工作坊', '黑客马拉松', '社区晚宴和对话'], cta: '查看日程' },
      classes: { title: '代码振动和区块链课程', sub: '流动状态下的编程——学习以平静的专注力创建。', points: ['初级到高级课程', '户外配对编程', 'AI工作流程', '周末演示之夜'], cta: '立即登记' },
      development: { title: '开发', sub: '明天的产品工程——从第一个想法到交付的软件。', points: ['定制开发', 'AI集成', '咨询和审计', 'MVP在数周内，而非数月'], cta: '开始项目' },
    },
    contact: {
      label: '联系', title: '联系我们', sub: '加入创新者和制作者的社区',
      name: '您的名字', emailTg: '电子邮件或Telegram', subject: '主题', message: '您的消息',
      send: '发送', sending: '发送中…', sentTitle: '消息已发送!', sentSub: '我们很快就会回复您。', error: '出了点问题——请重试。',
    },
    footer: { tagline: '用AI构建。改变吉尔吉斯斯坦的科技未来。', learn: '学习', business: '商业', connect: '联系', gifts: '礼品卡', rights: '© 2026 AIHub — 用心制作。没有废话，只有流程。' },
    tabs: { learn: '学习', work: '工作', blog: '博客', events: '活动', gifts: '礼品卡' },
    shell: { guest: '游客', guestHint: '游客 — 通过活动或Telegram登录', login: '登录', loginPrompt: '通过Telegram登录继续', openBot: '或在Telegram中打开 @{bot} →', logout: '登出', myClasses: '🎓 我的课程', myGifts: '🎁 礼品卡' },
    yoga: {
      title: '课程与离线时间', yourClasses: '您的课程', schedule: '早上8:00 · 晚上8:00',
      loginSee: '登录查看您的套餐 →', classesLeft: '剩余课程', pkgOf: '{name}的套餐',
      bookClass: '预订课程', book: '预订', booked: '✅ 已预订 — {date} {slot}', paySpotTag: '现场支付',
      classesLeftN: '还剩{n}课程', alreadyBooked: '您已预订了这个时间 🙂', failed: '预订失败——请重试。',
      upcoming: '即将到来', fromPackage: '套餐', paySpot: '现场支付', packages: '套餐',
      gifts: '礼品卡', redeem: '兑换', buyGiftLink: '购买礼品卡 →',
      noLeft: '课程已结束', noLeftSub: '您的套餐已用完——选择新套餐或现场支付。',
      buy: '购买', payOnSpot: '我会现场支付', cls: '课程', cls1: '课程',
      sunrise: '早上', sunset: '晚上',
      redeemed: '🎁 礼品已兑换——添加了{n}课程', redeemedAlready: '这张卡已经被兑换过了。', badCode: '无效代码。',
      loginPrompt: '通过Telegram登录预订课程和购买套餐',
      pkg: { test: '1课程', p4: '4课程', p8: '8课程', p12: '12课程' },
    },
    common: { loading: '加载中', usdt: 'USDT', kgs: 'KGS', approx: '≈' },
  },
}

const LANGS = ['en', 'ru', 'ky', 'zh']
const KEY = 'hub-lang'

function detectLang() {
  const saved = localStorage.getItem(KEY)
  if (LANGS.includes(saved)) return saved
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code
  const nav = (tgLang || navigator.language || 'en').toLowerCase()
  if (nav.startsWith('ru')) return 'ru'
  if (nav.startsWith('hy') || nav.startsWith('am')) return 'am'
  return 'en'
}

const Ctx = createContext(null)

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(detectLang)
  const setLang = useCallback((l) => {
    if (!LANGS.includes(l)) return
    localStorage.setItem(KEY, l)
    setLangState(l)
  }, [])

  const t = useCallback((path, vars) => {
    const resolve = (dict) => path.split('.').reduce((o, k) => (o == null ? undefined : o[k]), dict)
    let val = resolve(DICTS[lang])
    if (val === undefined) val = resolve(DICTS.en)
    if (val === undefined) return path
    if (typeof val === 'string' && vars) {
      for (const [k, v] of Object.entries(vars)) val = val.replaceAll(`{${k}}`, String(v))
    }
    return val
  }, [lang])

  return <Ctx.Provider value={{ t, lang, setLang }}>{children}</Ctx.Provider>
}

export const useI18n = () => useContext(Ctx)

export function LangSwitcher({ className = '' }) {
  const { lang, setLang } = useI18n()
  return (
    <div className={`inline-flex bg-chip border border-veil rounded-full p-0.5 ${className}`}>
      {LANGS.map(l => (
        <button key={l} onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-full font-mono text-[11px] uppercase transition-colors cursor-pointer ${lang === l ? 'text-white font-bold' : 'text-ink-faint hover:text-ink'}`}
          style={lang === l ? { background: 'linear-gradient(100deg, var(--accent), var(--accent-2))' } : undefined}>
          {l}
        </button>
      ))}
    </div>
  )
}
