import { createContext, useContext, useState, useCallback } from 'react'

const DICTS = {
  en: {
    greet: { morning: 'Good Morning', afternoon: 'Good Afternoon', evening: 'Good Evening', night: 'Hello, Night Owl' },
    nav: { home: 'Home', ideas: 'Use', rules: 'Pay', event: 'Build', contact: 'Contact', submit: 'Apply', therm: '$THERM', feed: 'Feed', blog: 'Blog' },
    therm: {
      kicker: '29.3 kWh · Solana',
      sub: 'THERM is an energy receipt. One token is one therm: 29.3 kilowatt-hours. Spend it and you buy inference. 1 $THERM = 100,000,000 AI tokens.',
      facts: ['1 therm = 29.3 kWh', '1 $THERM = 100,000,000 AI tokens', 'Solana x402'],
      ctaTalk: 'Talk to AI',
      tokenCard: 'The token', ca: 'Mint', treasury: 'Send $THERM here (memo = prompt)', atLaunch: 'Revealed at launch',
      network: 'network', standard: 'token standard',
      purposeLabel: 'use', qaCycles: 'question-and-answer cycles with AI',
      purposes: [
        { title: 'Inference on demand', body: 'A transfer on Solana is a job. The memo is the prompt. The price is the real estimate from the DAI node: tokens the job will use, divided by 100,000,000.', points: ['Priced from POST /api/estimate', '1 $THERM = 100,000,000 AI tokens', 'No account and no API key'] },
        { title: 'The reply comes back in the memo', body: 'Send $THERM to the treasury with the prompt in the memo. The answer is stored against that transaction and shown on the feed. Look it up by the signature.', points: ['Memo up to 500 bytes', 'The feed is the public log', 'Any answer is addressable by its transaction hash'] },
        { title: 'A reply any contract can read', body: 'The same answer is a data call. Poll it by signature and pass the text into a Solana instruction. The chain paid for the job. Your program consumes the result.', points: ['GET /api/x402/data/:signature', 'JSON, ready to put in instruction data', 'The transfer and the reply share one signature'] },
        { title: 'Pay with Solana x402', body: 'An HTTP request can ask for the same job and get a 402. The challenge is an exact THERM transfer on Solana. The amount is the estimate, not a flat fee. Retry with the signed transaction.', points: ['POST /api/x402/infer', 'Scheme exact, network solana, asset THERM', 'PAYMENT-REQUIRED, then PAYMENT-SIGNATURE'] },
      ],
      unitTitle: 'One therm',
      unitBody: 'A therm is a unit of heat. On this token it is a claim on 29.3 kWh, written as AI tokens.',
      unit1: '1 therm = 105,480,400 joules = 29.3 kWh.',
      unit2: '1 $THERM = 100,000,000 AI tokens.',
      unitClose: 'Joules in. Tokens out.',
      roadmapTitle: 'Roadmap',
      roadmap: ['Idea', 'MVP', 'Inference on Solana', 'Solana x402', 'Reply into a contract call', 'MCP', 'TBA'],
      state: { done: 'done', live: 'happening now', next: 'next', tba: 'to be announced' },
    },
    feed: {
      title: 'Feed', sub: 'Every $THERM transfer with a memo — and the answer the AI gave.',
      searchPh: 'Paste a $THERM transfer hash or Solscan link…', search: 'Search', result: 'Search result',
      notFound: 'Not found yet. Transfers show up within a few seconds — make sure it went to the Thermopolium wallet with a memo. Still looking…',
      badHash: 'That does not look like a Solana transaction hash.',
      empty: 'No posts yet. Send $THERM with a memo to the Thermopolium wallet and it will appear here.',
      thinking: 'AI is thinking…', queued: 'Waiting for the DAI network…', more: 'Load more',
      sent: 'sent {n}', onDai: 'answered on DAI',
    },
    compose: {
      fab: 'Ask AI', title: 'New post', placeholder: 'Ask the AI anything…',
      hint: 'Your prompt travels as the memo of a $THERM transfer — max 500 bytes, public on-chain.',
      aiTokens: 'AI tokens', quoting: 'Pricing your prompt…', post: 'Post',
      soonTitle: '$THERM has not launched yet', soonBody: 'Your prompt is saved on this device. Once the token is live you can post it by sending $THERM with this memo.', soonCta: 'Follow the launch',
      sendIntro: 'Open in wallet connects your Solana wallet and asks it to send this transfer. The transaction hash fills in by itself, and the answer opens on the feed.',
      sendTo: 'Send $THERM to', amount: 'Amount ($THERM)', memo: 'Memo (your prompt)', openWallet: 'Open in wallet',
      paying: 'Confirm the payment in your wallet…',
      noWallet: 'No Solana wallet found in this browser. Install Phantom or Solflare, or paste a hash below.',
      noTherm: 'That wallet does not have enough $THERM for this post.',
      noSol: 'The wallet needs a little SOL to pay the network fee.',
      payFailed: 'The wallet did not send the transfer.',
      cancelled: 'Payment cancelled.',
      sentIt: 'Already sent it?', txPh: 'Transaction hash', seeAnswer: 'See answer',
    },
    hero: {
      kicker: 'Energy RWA · Solana',
      title: 'THERM',
      sub: 'One therm of heat, written as a token. 29.3 kWh. Spend it and a model answers. The price of the answer is the real inference estimate.',
      ctaSubmit: 'Apply an app', ctaColosseum: 'Read the job estimate',
      dates: '1 therm = 29.3 kWh',
      reward: '1 $THERM = 100,000,000 AI tokens',
    },
    about: {
      title: 'Joules to tokens',
      body: 'A therm is 100,000 BTU of heat: 105,480,400 joules, or 29.3 kWh. This token is that unit. Holding it is a claim on the energy. Spending it buys inference on Solana.',
      mainLabel: 'The unit', mainDesc: '29.3 kWh',
      crossLabel: 'The spend', crossDesc: '100,000,000 AI tokens',
    },
    ideas: {
      title: 'What you can do with it',
      sub: 'Three calls. No ballot, no side track.',
      items: [
        'Send THERM with a memo. The memo is the prompt.',
        'Read the reply on the feed, next to that transaction.',
        'Hand the same reply to a Solana program as instruction data.',
        'Price the job first. POST /api/estimate on the DAI node.',
        'Pay an HTTP request with Solana x402, in THERM.',
        'Put the payment inside your own app. The user signs one transfer.',
      ],
      chainsTitle: 'Solana, paid in THERM',
      chainsNote: 'The job runs on the DAI network. The payment is an SPL transfer, or the same transfer inside an x402 challenge.',
    },
    rules: {
      title: 'How a payment works', sub: 'The amount is the estimate. The asset is THERM.',
      daiTitle: 'The estimate',
      daiBody: 'Before anyone pays, the server asks the DAI node what the job will cost. POST /api/estimate returns the tokens. Divide by 100,000,000. That is the THERM amount. A node without the route falls back to a local count of the prompt.',
      judgingTitle: 'Solana x402',
      judgingBody: 'POST /api/x402/infer with a prompt and no payment returns 402. The header PAYMENT-REQUIRED describes an exact THERM transfer to the treasury. Sign it, send it back as PAYMENT-SIGNATURE, and the job is queued. The reply is the same feed entry as a manual transfer.',
      termsTitle: 'What the token is not',
      terms: [
        'It does not vote on projects.',
        'It is not a ticket to a hackathon.',
        'One therm is 29.3 kWh. One token buys 100,000,000 AI tokens.',
        'The memo on the transfer is public. Do not put a secret in it.',
        'A contract reads the reply by asking for that transaction. It does not run the model itself.',
      ],
    },
    event: {
      title: 'List your app', sub: 'If a Solana program pays for inference in THERM, apply. Sign in with Telegram. No export from anywhere else.',
      dates: 'Solana', cta: 'Apply', ctaSub: 'A short form. Name, link, what the app does.',
      reward: 'Not a prize and not a vote.',
      chains: 'The app should pay with a THERM transfer or with Solana x402.',
    },
    contact: {
      label: 'contact', title: 'Get in Touch', sub: 'Questions about THERM, a payment, or your application? Message us.',
      name: 'Your Name', emailTg: 'Email or Telegram', subject: 'Subject', message: 'Your Message',
      send: 'Send Message', sending: 'Sending…', sentTitle: 'Message sent!', sentSub: "We'll get back to you soon.", error: 'Something went wrong — try again.',
    },
    footer: {
      tagline: '29.3 kWh, settled on Solana. Spend it on inference.',
      explore: 'Explore', resources: 'Resources', connect: 'Connect', gifts: 'Gift cards',
      rights: '© 2026 THERM. 1 therm = 29.3 kWh.',
    },
    tabs: { learn: 'Learn', work: 'Work', blog: 'Blog', events: 'Events', gifts: 'Gift cards' },
    shell: {
      guest: 'guest', guestHint: 'guest — log in via events or Telegram',
      login: 'Log in', loginPrompt: 'Log in with Telegram to continue', openBot: 'or open @{bot} in Telegram →',
      logout: 'Log out', myClasses: '🎟 My submissions', allSubmissions: 'All submissions', myGifts: '🎁 Gift cards',
    },
    events: {
      title: 'Events', upcoming: 'upcoming', past: 'past',
      noneUpcoming: 'No upcoming events yet — check back soon!', nonePast: 'No past events.',
      from: 'from', free: 'Free', freeEntry: 'Free entry', all: 'All events', tickets: 'Tickets',
      left: '{n} left', soldOut: 'SOLD OUT', buy: 'Buy', rsvp: 'RSVP', quantity: 'Quantity',
      yourName: 'Your name', contactPh: 'Email or Telegram (for the ticket)',
      continuePay: 'Continue to payment', getTicket: 'Get ticket', creating: 'Creating order…',
      notFound: 'Event not found.', checkoutFail: 'Checkout failed, try again.', soldOutMsg: 'Sold out — sorry!',
      submit: 'Apply', submitTitle: 'Apply your app',
      subName: 'Your name', subProject: 'App name', subGithub: 'GitHub (repo or profile)', subX: 'X (handle or link)',
      subTg: 'Telegram (@handle)', subLink: 'Link to the app',
      subAbout: 'What it does with THERM',
      subColoWait: 'Reading the page…', subColoReady: 'Details pulled',
      subColoInvalid: 'Paste an https link to the app.',
      subColoMissing: 'That link did not resolve.',
      subColoDown: 'The page did not answer. You can still apply.',
      subBlockchain: 'Chain', subCountry: 'Country',
      subAuthedAs: 'Applying as {handle} — verified via Telegram login',
      subLoginPrompt: 'Log in with Telegram to apply',
      subDupe: "You've already applied for this chain from this Telegram account.",
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
      orderCode: 'Order code', noMethod: 'Payment is being set up', noMethodSub: 'This ticket is priced in som and settles in KGST — the wallet goes live shortly. Message us with the code below and we will hold your seat and confirm payment manually.', noMethodCta: 'Write to us in Telegram',
      kgstTitle: 'Pay in KGST · BNB Chain', kgstNote: '1 KGST = 1 KGS. Send the exact amount to the address below, then paste the transaction hash — we confirm it manually.',
      kgstAddrLabel: 'KGST · our BNB Chain wallet', kgstTokenLabel: 'KGST token contract (BEP-20)', kgstAmountLabel: 'Amount (KGST)', kgstNetwork: 'Network: BNB Smart Chain · chain ID 56',
    },
    ticket: { brand: 'THERM · Ticket', valid: 'valid', checkedIn: 'checked in', notFound: 'Ticket not found.' },
    submissions: {
      mine: 'My submissions', all: 'All submissions',
      empty: 'You have not submitted a project yet.', emptyAll: 'No submissions yet.',
      login: 'Log in with Telegram to see your submissions',
      submitCta: 'Submit a project', by: 'Submitted by', open: 'Open project',
    },
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
    nav: { home: 'Главная', ideas: 'Зачем', rules: 'Оплата', event: 'Собрать', contact: 'Контакты', submit: 'Заявка', therm: '$THERM', feed: 'Лента', blog: 'Блог' },
    therm: {
      kicker: '29,3 кВт·ч · Solana',
      sub: 'THERM — расписка на энергию. Один токен — один терм: 29,3 киловатт-часа. Потратили — купили инференс. 1 $THERM = 100 000 000 AI-токенов.',
      facts: ['1 терм = 29,3 кВт·ч', '1 $THERM = 100 000 000 AI-токенов', 'Solana x402'],
      ctaTalk: 'Спросить AI',
      tokenCard: 'Токен', ca: 'Адрес контракта', treasury: 'Отправляйте $THERM сюда (memo = промпт)', atLaunch: 'Будет объявлен на запуске',
      network: 'сеть', standard: 'стандарт токена',
      purposeLabel: 'назначение', qaCycles: 'циклов «вопрос — ответ» с AI',
      purposes: [
        { title: 'Инференс по запросу', body: 'Перевод в Solana — это задача. Memo — промпт. Цена — живая оценка узла DAI: сколько токенов уйдёт на задачу, делённое на 100 000 000.', points: ['Цена из POST /api/estimate', '1 $THERM = 100 000 000 AI-токенов', 'Без аккаунта и без API-ключа'] },
        { title: 'Ответ возвращается в memo', body: 'Отправьте $THERM на казну, промпт положите в memo. Ответ хранится рядом с этой транзакцией и виден в ленте. Ищите по подписи.', points: ['Memo до 500 байт', 'Лента — публичный журнал', 'Любой ответ находится по хешу транзакции'] },
        { title: 'Ответ, который прочитает контракт', body: 'Тот же ответ — это данные. Запросите его по подписи и положите текст в инструкцию Solana. Сеть уже оплатила задачу. Программа забирает результат.', points: ['GET /api/x402/data/:signature', 'JSON, готовый для данных инструкции', 'Перевод и ответ делят одну подпись'] },
        { title: 'Оплата через Solana x402', body: 'HTTP-запрос может попросить ту же задачу и получить 402. Челлендж — точный перевод THERM в Solana. Сумма берётся из оценки, это не плоский тариф. Повторите запрос с подписанной транзакцией.', points: ['POST /api/x402/infer', 'Схема exact, сеть solana, актив THERM', 'Сначала PAYMENT-REQUIRED, затем PAYMENT-SIGNATURE'] },
      ],
      unitTitle: 'Один терм',
      unitBody: 'Терм — единица тепла. В этом токене это право на 29,3 кВт·ч, записанное как AI-токены.',
      unit1: '1 терм = 105 480 400 джоулей = 29,3 кВт·ч.',
      unit2: '1 $THERM = 100 000 000 AI-токенов.',
      unitClose: 'Джоули на входе. Токены на выходе.',
      roadmapTitle: 'Дорожная карта',
      roadmap: ['Идея', 'MVP', 'Инференс в Solana', 'Solana x402', 'Ответ в вызов контракта', 'MCP', 'TBA'],
      state: { done: 'готово', live: 'идёт сейчас', next: 'дальше', tba: 'будет объявлено' },
    },
    feed: {
      title: 'Лента', sub: 'Каждый перевод $THERM с memo — и ответ, который дал AI.',
      searchPh: 'Вставьте хеш перевода $THERM или ссылку Solscan…', search: 'Найти', result: 'Результат поиска',
      notFound: 'Пока не найдено. Переводы появляются через несколько секунд — проверьте, что он ушёл на кошелёк Thermopolium и с memo. Продолжаем искать…',
      badHash: 'Это не похоже на хеш транзакции Solana.',
      empty: 'Пока нет постов. Отправьте $THERM с memo на кошелёк Thermopolium — и он появится здесь.',
      thinking: 'AI думает…', queued: 'Ждём сеть DAI…', more: 'Показать ещё',
      sent: 'отправил {n}', onDai: 'ответ в сети DAI',
    },
    compose: {
      fab: 'Спросить AI', title: 'Новый пост', placeholder: 'Спросите AI о чём угодно…',
      hint: 'Ваш промпт едет как memo перевода $THERM — не больше 500 байт, публично в блокчейне.',
      aiTokens: 'AI-токенов', quoting: 'Считаем цену промпта…', post: 'Отправить',
      soonTitle: '$THERM ещё не запущен', soonBody: 'Ваш промпт сохранён на этом устройстве. Когда токен запустится, отправьте $THERM с этим memo.', soonCta: 'Следить за запуском',
      sendIntro: '«Открыть в кошельке» подключает Solana-кошелёк и просит его отправить этот перевод. Хеш подставится сам, и ответ откроется в ленте.',
      sendTo: 'Отправьте $THERM на', amount: 'Сумма ($THERM)', memo: 'Memo (ваш промпт)', openWallet: 'Открыть в кошельке',
      paying: 'Подтвердите оплату в кошельке…',
      noWallet: 'В этом браузере нет Solana-кошелька. Установите Phantom или Solflare, либо вставьте хеш ниже.',
      noTherm: 'На этом кошельке недостаточно $THERM для поста.',
      noSol: 'На кошельке нужно немного SOL, чтобы оплатить комиссию сети.',
      payFailed: 'Кошелёк не отправил перевод.',
      cancelled: 'Оплата отменена.',
      sentIt: 'Уже отправили?', txPh: 'Хеш транзакции', seeAnswer: 'Показать ответ',
    },
    hero: {
      kicker: 'Энергия · Solana',
      title: 'THERM',
      sub: 'Один терм тепла, записанный токеном. 29,3 кВт·ч. Потратили — модель отвечает. Цена ответа — живая оценка инференса.',
      ctaSubmit: 'Подать приложение', ctaColosseum: 'Как считается цена',
      dates: '1 терм = 29,3 кВт·ч',
      reward: '1 $THERM = 100 000 000 AI-токенов',
    },
    about: {
      title: 'От джоулей к токенам',
      body: 'Терм — это 100 000 BTU тепла: 105 480 400 джоулей, или 29,3 кВт·ч. Этот токен и есть эта единица. Держать его — держать энергию. Тратить — покупать инференс в Solana.',
      mainLabel: 'Единица', mainDesc: '29,3 кВт·ч',
      crossLabel: 'Трата', crossDesc: '100 000 000 AI-токенов',
    },
    ideas: {
      title: 'Что с ним можно сделать',
      sub: 'Три вызова. Без голосования и без сайд-трека.',
      items: [
        'Отправьте THERM с memo. Memo — это промпт.',
        'Прочитайте ответ в ленте, рядом с этой транзакцией.',
        'Отдайте тот же ответ программе Solana как данные инструкции.',
        'Сначала узнайте цену. POST /api/estimate на узле DAI.',
        'Оплатите HTTP-запрос через Solana x402, в THERM.',
        'Встройте оплату в своё приложение. Пользователь подписывает один перевод.',
      ],
      chainsTitle: 'Solana, оплата в THERM',
      chainsNote: 'Задача считается в сети DAI. Оплата — SPL-перевод или тот же перевод внутри челленджа x402.',
    },
    rules: {
      title: 'Как устроена оплата', sub: 'Сумма — это оценка. Актив — THERM.',
      daiTitle: 'Оценка',
      daiBody: 'До оплаты сервер спрашивает узел DAI, сколько будет стоить задача. POST /api/estimate возвращает токены. Делим на 100 000 000. Это сумма в THERM. Если у узла нет этого маршрута, считается локально по длине промпта.',
      judgingTitle: 'Solana x402',
      judgingBody: 'POST /api/x402/infer с промптом и без оплаты возвращает 402. Заголовок PAYMENT-REQUIRED описывает точный перевод THERM в казну. Подпишите его, верните как PAYMENT-SIGNATURE — задача встанет в очередь. Ответ попадёт в ту же ленту, что и ручной перевод.',
      termsTitle: 'Чем токен не является',
      terms: [
        'Им не голосуют за проекты.',
        'Это не билет на хакатон.',
        'Один терм — 29,3 кВт·ч. Один токен покупает 100 000 000 AI-токенов.',
        'Memo перевода публичен. Не кладите туда секрет.',
        'Контракт читает ответ, запросив эту транзакцию. Сам модель он не запускает.',
      ],
    },
    event: {
      title: 'Добавьте приложение', sub: 'Если программа на Solana платит за инференс в THERM, подайте заявку. Вход через Telegram. Ничего ниоткуда экспортировать не нужно.',
      dates: 'Solana', cta: 'Заявка', ctaSub: 'Короткая форма. Имя, ссылка, что делает приложение.',
      reward: 'Это не приз и не голос.',
      chains: 'Приложение должно платить переводом THERM или через Solana x402.',
    },
    contact: {
      label: 'контакты', title: 'Свяжитесь с нами', sub: 'Вопросы про THERM, оплату или вашу заявку? Напишите нам.',
      name: 'Ваше имя', emailTg: 'Email или Telegram', subject: 'Тема', message: 'Ваше сообщение',
      send: 'Отправить', sending: 'Отправка…', sentTitle: 'Сообщение отправлено!', sentSub: 'Мы скоро свяжемся с вами.', error: 'Что-то пошло не так — попробуйте ещё раз.',
    },
    footer: {
      tagline: '29,3 кВт·ч в Solana. Тратится на инференс.',
      explore: 'Разделы', resources: 'Ресурсы', connect: 'Связь', gifts: 'Подарочные карты',
      rights: '© 2026 THERM. 1 терм = 29,3 кВт·ч.',
    },
    tabs: { learn: 'Учёба', work: 'Работа', blog: 'Блог', events: 'События', gifts: 'Подарочные карты' },
    shell: {
      guest: 'гость', guestHint: 'гость — войдите через события или Telegram',
      login: 'Войти', loginPrompt: 'Войдите через Telegram, чтобы продолжить', openBot: 'или откройте @{bot} в Telegram →',
      logout: 'Выйти', myClasses: '🎟 Мои заявки', allSubmissions: 'Все заявки', myGifts: '🎁 Подарочные карты',
    },
    events: {
      title: 'События', upcoming: 'скоро', past: 'прошли',
      noneUpcoming: 'Пока нет предстоящих событий — загляните позже!', nonePast: 'Прошедших событий нет.',
      from: 'от', free: 'Бесплатно', freeEntry: 'Вход свободный', all: 'Все события', tickets: 'Билеты',
      left: 'осталось {n}', soldOut: 'РАСПРОДАНО', buy: 'Купить', rsvp: 'Записаться', quantity: 'Количество',
      yourName: 'Ваше имя', contactPh: 'Email или Telegram (для билета)',
      continuePay: 'Перейти к оплате', getTicket: 'Получить билет', creating: 'Создаём заказ…',
      notFound: 'Событие не найдено.', checkoutFail: 'Не удалось оформить заказ, попробуйте ещё раз.', soldOutMsg: 'Распродано — увы!',
      submit: 'Заявка', submitTitle: 'Заявка на приложение',
      subName: 'Ваше имя', subProject: 'Название приложения', subGithub: 'GitHub (репозиторий или профиль)', subX: 'X (ник или ссылка)',
      subTg: 'Telegram (@ник)', subLink: 'Ссылка на приложение',
      subAbout: 'Что оно делает с THERM',
      subColoWait: 'Читаем страницу…', subColoReady: 'Данные подтянуты',
      subColoInvalid: 'Вставьте https-ссылку на приложение.',
      subColoMissing: 'Ссылка не открылась.',
      subColoDown: 'Страница не ответила. Заявку всё равно можно отправить.',
      subBlockchain: 'Сеть', subCountry: 'Страна',
      subAuthedAs: 'Заявка от {handle} — подтверждено через вход в Telegram',
      subLoginPrompt: 'Войдите через Telegram, чтобы подать заявку',
      subDupe: 'Вы уже подавали заявку на эту сеть с этого Telegram-аккаунта.',
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
      orderCode: 'Код заказа', noMethod: 'Оплата настраивается', noMethodSub: 'Билет в сомах и оплачивается в KGST — кошелёк подключаем на днях. Напишите нам с кодом ниже: мы придержим место и подтвердим оплату вручную.', noMethodCta: 'Написать в Telegram',
      kgstTitle: 'Оплата в KGST · BNB Chain', kgstNote: '1 KGST = 1 сом. Отправьте точную сумму на адрес ниже и вставьте хеш транзакции — мы подтвердим вручную.',
      kgstAddrLabel: 'KGST · наш кошелёк в BNB Chain', kgstTokenLabel: 'Контракт токена KGST (BEP-20)', kgstAmountLabel: 'Сумма (KGST)', kgstNetwork: 'Сеть: BNB Smart Chain · chain ID 56',
    },
    ticket: { brand: 'THERM · Билет', valid: 'действителен', checkedIn: 'использован', notFound: 'Билет не найден.' },
    submissions: {
      mine: 'Мои заявки', all: 'Все заявки',
      empty: 'Вы ещё не подавали проект.', emptyAll: 'Заявок пока нет.',
      login: 'Войдите через Telegram, чтобы увидеть свои заявки',
      submitCta: 'Подать проект', by: 'Подал', open: 'Открыть проект',
    },
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

}

const LANGS = ['en', 'ru']
const KEY = 'hub-lang'

function detectLang() {
  const saved = localStorage.getItem(KEY)
  if (LANGS.includes(saved)) return saved
  const tgLang = window.Telegram?.WebApp?.initDataUnsafe?.user?.language_code
  const nav = (tgLang || navigator.language || 'en').toLowerCase()
  if (nav.startsWith('ru')) return 'ru'
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
    <div className={`inline-flex bg-chip border border-veil rounded-sm p-0.5 ${className}`}>
      {LANGS.map(l => (
        <button key={l} onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-sm font-mono text-[11px] uppercase transition-colors cursor-pointer ${lang === l ? 'font-bold' : 'text-ink-faint hover:text-ink'}`}
          style={lang === l ? { background: 'var(--accent)', color: 'var(--on-accent, #140e06)' } : undefined}>
          {l}
        </button>
      ))}
    </div>
  )
}
