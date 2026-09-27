import { createContext, useContext, useState, useCallback } from 'react'

const DICTS = {
  en: {
    greet: { morning: 'Good Morning', afternoon: 'Good Afternoon', evening: 'Good Evening', night: 'Hello, Night Owl' },
    nav: { home: 'Home', ideas: 'Ideas', rules: 'Rules', event: 'Event', contact: 'Contact', submit: 'Submit a project', therm: '$THERM', feed: 'Feed', blog: 'Blog' },
    top: {
      label: 'community', title: 'Top 10 supported projects',
      sub: 'Colosseum projects submitted via Thermopolium, ranked by the community with $THERM — more tokens, more vote.',
      subTherm: 'Ranked by the $THERM held by the wallets backing each project. The community decides the winners.',
      empty: 'No projects yet. The first Thermopolium submissions will appear here — and the community picks the winners with $THERM.',
      vote: 'Back it', voters: 'backers', voted: 'Vote counted — thank you!',
      noWallet: 'Open this page in a Solana wallet (Phantom, Solflare…) to vote.',
      noTherm: 'This wallet holds no $THERM — hold some to vote.',
      soon: 'Voting opens when $THERM launches.', failed: 'Could not record the vote — try again.',
      aboutTherm: 'About $THERM',
    },
    therm: {
      kicker: 'Community token · Solana',
      sub: 'The community token of Thermopolium. A seasonal fair launch that runs next to the Colosseum hackathons — holders decide the winners, and talk to AI straight from a token transfer.',
      facts: ['Community token on Solana', 'Fair launch via cyreneai.com', 'Seasonal — runs next to Colosseum Hackathons'],
      ctaTalk: 'Talk to AI', ctaVote: 'Vote on projects',
      tokenCard: 'The token', ca: 'Contract address', treasury: 'Send $THERM here (memo = prompt)', atLaunch: 'Revealed at launch',
      network: 'network', launchVia: 'fair launch via',
      purposeLabel: 'purpose', qaCycles: 'question-and-answer cycles with AI',
      purposes: [
        { title: 'More tokens, more vote', body: 'The community decides the winners. Every project submitted through Thermopolium to the Colosseum hackathon can be backed by holders — your vote weighs exactly as much $THERM as your wallet holds. The current top 10 lives on the home page.', points: ['One wallet, one vote — signed with your wallet, no gas', 'Weight = your $THERM balance, refreshed from the chain', 'The top 10 is always on the home page'] },
        { title: 'Talk with AI via a token transfer', body: 'Send $THERM to the Thermopolium wallet with a memo. The memo is your prompt: a signed job is published to the DAI network and the answer lands on the feed. No account, no API key — the transfer is the message.', points: ['1 $THERM = 100,000,000 AI tokens', 'Memo up to 500 bytes — the Solana memo limit', 'Look up any answer by its transaction hash'] },
        { title: 'Exclusive opportunities', tag: 'TBA', body: 'Some doors open only for holders: early access to sponsor tools, private workshops and the next Thermopolium seasons. Details to be announced.', points: ['Holder-only access', 'Announced season by season', 'More to come'] },
        { title: 'Loyalty & rewards', tag: 'TBA', body: 'Season after season, active holders and voters earn recognition: rewards for backing winning projects, perks at meetups and workshops, and priority in what comes next.', points: ['Rewards for backing winners', 'Perks at offline meetups & workshops', 'Priority for returning holders'] },
      ],
      unitTitle: 'Why “THERM”?',
      unitBody: 'The name comes from something different than Thermopolium. A therm is a unit of energy: 1 therm = 29.3 kilowatt-hours (kWh). To put it into perspective:',
      unit1: 'It can power a typical refrigerator for roughly 2 to 3 weeks.',
      unit2: 'It equals 100 million AI tokens — a question-and-answer cycle with AI, 100,000 times.',
      unitClose: 'Energy in, intelligence out.',
      roadmapTitle: 'Roadmap',
      roadmap: ['Idea', 'MVP', 'First Thermopolium featuring World\'s Fair', 'Live stream with Cyrene', 'Colosseum application', 'Token launch', 'Offline meetups & workshops', 'TBA…'],
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
      sendIntro: 'Send this transfer from any Solana wallet, then paste the transaction hash to see the answer.',
      sendTo: 'Send $THERM to', amount: 'Amount ($THERM)', memo: 'Memo (your prompt)', openWallet: 'Open in wallet',
      sentIt: 'Already sent it?', txPh: 'Transaction hash', seeAnswer: 'See answer',
    },
    hero: {
      kicker: 'Colosseum World\'s Fair — side track',
      title: 'Thermopolium',
      sub: 'The street stall next to the arena. Compete in Colosseum, dual-submit here for the local-fiat & AI-agent layer — judged separately, paid in local stablecoins.',
      ctaSubmit: 'Submit a project', ctaColosseum: 'View Colosseum World\'s Fair ↗',
      dates: 'Sep 28 — Oct 12, 2026',
      reward: '$1,000 per country, paid in local ai-stablecoins',
    },
    about: {
      title: 'What is Thermopolium?',
      body: 'Thermopolium is a side track next to Colosseum. Same idea as the old street stall beside the arena: you compete in the main event, and you can also submit here for an extra shot. Submit the same project to Colosseum and Thermopolium — we score the local-fiat / agent layer, and prizes are paid in local stablecoins.',
      mainLabel: 'Main event', mainDesc: 'Colosseum World\'s Fair',
      crossLabel: 'Side track', crossDesc: '$1,000 per country, paid in local ai-stablecoins',
    },
    ideas: {
      title: 'Ideas that fit',
      sub: 'Any of these — or your own spin on the local-fiat / agent layer.',
      items: [
        'AI agent for local OTC / fiat rails',
        'MCPs for Colosseum sponsors',
        'Agents for DAI Network and other chains that sponsor Colosseum tracks',
        'Multi-rail OTC matcher that quotes and settles in local stables',
        'Payroll / invoice agent paid in local stables',
        'Local-language agent + local payment methods',
        'Sponsor-tool router via MCP',
        'Cross-pavilion agent: Colosseum submission + Thermopolium fiat layer',
        'P2P AI agent that trades USDT on any chain against your local stablecoin',
      ],
      chainsTitle: 'Build on any chain',
      chainsNote: 'The product can be built on any of these — the one hard requirement is that it uses DAI somehow.',
    },
    rules: {
      title: 'Rules', sub: 'Casual, Colosseum-style — not a law firm.',
      daiTitle: 'Any chain — just use DAI somehow',
      daiBody: 'Your project can be built on any chain — Solana, Ethereum, Hydromancer, Base, Tempo, Arbitrum, Zcash, Robinhood Chain, or DAI Network itself. The one hard requirement is that it uses DAI somehow: DAI Miner (iamai.kg) running a job, skill, agent, or chat flow a judge can actually trigger; DAI MCP; local-stable settlement; or peer nodes. A P2P AI agent that trades USDT against your local stablecoin on any of the chains above counts. External tools and other MCP servers are allowed — the more of the heavy lifting stays on DAI instead of just wrapping a hosted API, the higher the score.',
      judgingTitle: 'Judging, in plain terms',
      judgingBody: 'Does it use DAI somehow. Does a real person in a real country get a local-fiat or sponsor-tool job done. Did you use DAI for more than a splash screen.',
      termsTitle: 'Casual T&Cs',
      terms: [
        'This is a side track, not a separate universe. You should also be in the current Colosseum competition (World\'s Fair now, or the next Solana cycle). Dual-submit is the point.',
        'Ship a working product. Slides without a demo that actually uses DAI don\'t count.',
        'Build on any chain — Solana, Ethereum, Hydromancer, Base, Tempo, Arbitrum, Zcash, Robinhood Chain. Must use DAI somehow. More DAI-native = higher score.',
        'Prizes are discretionary. We can verify, ask for a walkthrough, or skip a submission that doesn\'t run.',
        'One team, one submission. Same product can live on both Colosseum and Thermopolium.',
        '18+ / age of majority where you live. Don\'t enter if sanctions or local law say you can\'t.',
        'Organizer / sponsor staff and their immediate family are out.',
        'Local-stable prizes are paid after we can actually send them. Taxes are on you.',
        'We are not on the hook for agent bugs, third-party APIs, OTC counterparties, or someone losing funds.',
        'Don\'t break the law in your jurisdiction. Don\'t harass people. Don\'t fake the demo.',
        'By submitting, you accept these terms. If something\'s unclear, ask before the deadline — not after judging.',
      ],
    },
    event: {
      title: 'Submit your project', sub: 'Free to enter — RSVP / submit via the app, sign in with Telegram.',
      dates: 'Sep 28 — Oct 12, 2026', cta: 'Submit a project', ctaSub: 'Opens the Thermopolium event in the app',
      reward: '$1,000 equivalent in your local ai-stablecoin — one prize per country DAI supports.',
      chains: 'Build on any chain — Solana, Ethereum, Hydromancer, Base, Tempo, Arbitrum, Zcash, Robinhood Chain — just use DAI somehow.',
    },
    contact: {
      label: 'contact', title: 'Get in Touch', sub: 'Questions about Thermopolium, DAI Miner, or your submission? Message us.',
      name: 'Your Name', emailTg: 'Email or Telegram', subject: 'Subject', message: 'Your Message',
      send: 'Send Message', sending: 'Sending…', sentTitle: 'Message sent!', sentSub: "We'll get back to you soon.", error: 'Something went wrong — try again.',
    },
    footer: {
      tagline: 'A side track next to Colosseum. Judged on the local-fiat & AI-agent layer, paid in local stablecoins.',
      explore: 'Explore', resources: 'Resources', connect: 'Connect', gifts: 'Gift cards',
      rights: '© 2026 Thermopolium × AIHub — a Colosseum World\'s Fair side track.',
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
      submit: 'Submit a project', submitTitle: 'Submit a project',
      subName: 'Your name', subProject: 'Project name', subGithub: 'GitHub (repo or profile)', subX: 'X (handle or link)',
      subTg: 'Telegram (@handle)', subLink: 'Link to your project on Colosseum',
      subColoWait: 'Reading the Colosseum page…', subColoReady: 'Details pulled from Colosseum',
      subColoInvalid: 'Paste a link like colosseum.com/arena/projects/your-project',
      subColoMissing: 'Colosseum has no project at that link.',
      subColoDown: 'Colosseum did not answer. You can still submit — we will try again when you send it.',
      subBlockchain: 'Blockchain', subCountry: 'Country (your local ai-stablecoin)',
      subAuthedAs: 'Submitting as {handle} — verified via Telegram login',
      subLoginPrompt: 'Log in with Telegram to submit a project',
      subDupe: "You've already submitted a project for this blockchain from this Telegram account.",
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
    ticket: { brand: 'Thermopolium · Ticket', valid: 'valid', checkedIn: 'checked in', notFound: 'Ticket not found.' },
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
    nav: { home: 'Главная', ideas: 'Идеи', rules: 'Правила', event: 'Событие', contact: 'Контакты', submit: 'Подать проект', therm: '$THERM', feed: 'Лента', blog: 'Блог' },
    top: {
      label: 'сообщество', title: 'Топ-10 поддержанных проектов',
      sub: 'Проекты Colosseum, поданные через Thermopolium, ранжирует сообщество с помощью $THERM — больше токенов, больше голос.',
      subTherm: 'Рейтинг по $THERM на кошельках, поддержавших проект. Победителей выбирает сообщество.',
      empty: 'Пока нет проектов. Первые заявки Thermopolium появятся здесь — а победителей выберет сообщество с помощью $THERM.',
      vote: 'Поддержать', voters: 'сторонников', voted: 'Голос учтён — спасибо!',
      noWallet: 'Откройте страницу в Solana-кошельке (Phantom, Solflare…), чтобы голосовать.',
      noTherm: 'На этом кошельке нет $THERM — держите токены, чтобы голосовать.',
      soon: 'Голосование откроется после запуска $THERM.', failed: 'Не удалось записать голос — попробуйте ещё раз.',
      aboutTherm: 'О $THERM',
    },
    therm: {
      kicker: 'Токен сообщества · Solana',
      sub: 'Токен сообщества Thermopolium. Сезонный fair launch рядом с хакатонами Colosseum — держатели выбирают победителей и общаются с AI прямо через перевод токенов.',
      facts: ['Токен сообщества на Solana', 'Fair launch через cyreneai.com', 'Сезонный — идёт рядом с хакатонами Colosseum'],
      ctaTalk: 'Поговорить с AI', ctaVote: 'Голосовать за проекты',
      tokenCard: 'Токен', ca: 'Адрес контракта', treasury: 'Отправляйте $THERM сюда (memo = промпт)', atLaunch: 'Будет объявлен на запуске',
      network: 'сеть', launchVia: 'fair launch через',
      purposeLabel: 'назначение', qaCycles: 'циклов «вопрос — ответ» с AI',
      purposes: [
        { title: 'Больше токенов — больше голос', body: 'Победителей выбирает сообщество. Любой проект, поданный через Thermopolium на хакатон Colosseum, могут поддержать держатели — ваш голос весит ровно столько $THERM, сколько на вашем кошельке. Актуальный топ-10 — на главной странице.', points: ['Один кошелёк — один голос: подпись кошельком, без комиссий', 'Вес = ваш баланс $THERM, обновляется из блокчейна', 'Топ-10 всегда на главной странице'] },
        { title: 'Разговор с AI через перевод токенов', body: 'Отправьте $THERM на кошелёк Thermopolium с memo. Memo — это ваш промпт: в сеть DAI публикуется подписанная задача, а ответ появляется в ленте. Без аккаунта и API-ключа — перевод и есть сообщение.', points: ['1 $THERM = 100 000 000 AI-токенов', 'Memo до 500 байт — лимит memo в Solana', 'Любой ответ находится по хешу транзакции'] },
        { title: 'Эксклюзивные возможности', tag: 'TBA', body: 'Некоторые двери открыты только держателям: ранний доступ к инструментам спонсоров, закрытые воркшопы и следующие сезоны Thermopolium. Подробности будут объявлены.', points: ['Доступ только для держателей', 'Объявляется сезон за сезоном', 'Это ещё не всё'] },
        { title: 'Лояльность и награды', tag: 'TBA', body: 'Сезон за сезоном активные держатели и голосующие получают признание: награды за поддержку победивших проектов, бонусы на митапах и воркшопах и приоритет в том, что будет дальше.', points: ['Награды за поддержку победителей', 'Бонусы на офлайн-митапах и воркшопах', 'Приоритет для вернувшихся держателей'] },
      ],
      unitTitle: 'Почему «THERM»?',
      unitBody: 'Название происходит от другого слова, а не от Thermopolium. Therm — единица энергии: 1 therm = 29,3 киловатт-часа (кВт·ч). Чтобы почувствовать масштаб:',
      unit1: 'Этого хватит, чтобы питать обычный холодильник примерно 2–3 недели.',
      unit2: 'Это 100 миллионов AI-токенов — 100 000 циклов «вопрос — ответ» с AI.',
      unitClose: 'Энергия на входе — интеллект на выходе.',
      roadmapTitle: 'Дорожная карта',
      roadmap: ['Идея', 'MVP', 'Первый Thermopolium на World\'s Fair', 'Прямой эфир с Cyrene', 'Заявка в Colosseum', 'Запуск токена', 'Офлайн-митапы и воркшопы', 'TBA…'],
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
      sendIntro: 'Отправьте этот перевод из любого Solana-кошелька, затем вставьте хеш транзакции, чтобы увидеть ответ.',
      sendTo: 'Отправьте $THERM на', amount: 'Сумма ($THERM)', memo: 'Memo (ваш промпт)', openWallet: 'Открыть в кошельке',
      sentIt: 'Уже отправили?', txPh: 'Хеш транзакции', seeAnswer: 'Показать ответ',
    },
    hero: {
      kicker: 'Colosseum World\'s Fair — сайд-трек',
      title: 'Thermopolium',
      sub: 'Уличная лавка рядом с ареной. Соревнуйтесь в Colosseum и параллельно подавайтесь сюда — за слой локального фиата и AI-агентов. Судим отдельно, призы в локальных стейблкоинах.',
      ctaSubmit: 'Подать проект', ctaColosseum: 'Смотреть Colosseum World\'s Fair ↗',
      dates: '28 сентября — 12 октября 2026',
      reward: '$1000 на страну, в локальных ai-стейблкоинах',
    },
    about: {
      title: 'Что такое Thermopolium?',
      body: 'Thermopolium — сайд-трек рядом с Colosseum. Как старая уличная лавка у арены: вы соревнуетесь в основном событии и можете подать заявку ещё и сюда — за дополнительный шанс. Подайте один и тот же проект на Colosseum и Thermopolium — мы оцениваем слой локального фиата / агентов, а призы платим в локальных стейблкоинах.',
      mainLabel: 'Основное событие', mainDesc: 'Colosseum World\'s Fair',
      crossLabel: 'Сайд-трек', crossDesc: '$1000 на страну, в локальных ai-стейблкоинах',
    },
    ideas: {
      title: 'Подходящие идеи',
      sub: 'Любая из них — или ваша собственная вариация на тему локального фиата и агентов.',
      items: [
        'AI-агент для локального OTC / фиатных рельсов',
        'MCP для спонсоров Colosseum',
        'Агенты для DAI Network и других сетей-спонсоров треков Colosseum',
        'Мульти-рельсовый OTC-мэтчер с котировками и расчётом в локальных стейблах',
        'Агент для зарплат / инвойсов с оплатой в локальных стейблах',
        'Агент на локальном языке + локальные способы оплаты',
        'Роутер спонсорских инструментов через MCP',
        'Кросс-павильонный агент: заявка на Colosseum + фиат-слой Thermopolium',
        'P2P AI-агент, торгующий USDT на любом блокчейне против вашего локального стейблкоина',
      ],
      chainsTitle: 'Стройте на любом блокчейне',
      chainsNote: 'Продукт можно построить на любом из них — единственное обязательное условие: использовать DAI хоть как-то.',
    },
    rules: {
      title: 'Правила', sub: 'Простые условия в стиле Colosseum — не юридическая контора.',
      daiTitle: 'Любой блокчейн — главное использовать DAI',
      daiBody: 'Ваш проект можно построить на любом блокчейне — Solana, Ethereum, Hydromancer, Base, Tempo, Arbitrum, Zcash, Robinhood Chain, или на самой сети DAI. Единственное обязательное условие: использовать DAI хоть как-то — DAI Miner (iamai.kg), запускающий job, skill, agent или chat-флоу, который судья может запустить сам; DAI MCP; расчёты в локальном стейбле; или peer-ноды. P2P AI-агент, торгующий USDT против вашего локального стейблкоина на любом из блокчейнов выше — тоже засчитывается. Внешние инструменты и другие MCP-серверы разрешены — чем больше «тяжёлой» логики остаётся на DAI, а не просто оборачивает готовый API, тем выше оценка.',
      judgingTitle: 'Судейство простыми словами',
      judgingBody: 'Использует ли проект DAI хоть как-то. Получает ли реальный человек в реальной стране решённую задачу с локальным фиатом или спонсорским инструментом. Использовали ли вы DAI не только как заставку на экране запуска.',
      termsTitle: 'Простые условия',
      terms: [
        'Это сайд-трек, а не отдельная вселенная. Вы также должны участвовать в текущем соревновании Colosseum (сейчас — World\'s Fair, или следующий цикл Solana). В этом и суть двойной подачи.',
        'Покажите рабочий продукт. Слайды без демо, которое реально использует DAI, не считаются.',
        'Стройте на любом блокчейне — Solana, Ethereum, Hydromancer, Base, Tempo, Arbitrum, Zcash, Robinhood Chain. DAI нужно использовать хоть как-то. Чем больше DAI-native — тем выше балл.',
        'Призы выдаются на усмотрение организаторов. Мы можем проверить, попросить показать вживую или пропустить заявку, которая не запускается.',
        'Одна команда — одна заявка. Один и тот же продукт может быть и на Colosseum, и на Thermopolium.',
        '18+ / совершеннолетие по месту жительства. Не участвуйте, если это запрещено санкциями или локальным законом.',
        'Организаторы, сотрудники спонсоров и их ближайшие родственники не участвуют.',
        'Призы в локальных стейблах выплачиваются, когда мы физически можем их отправить. Налоги — на вас.',
        'Мы не отвечаем за баги агентов, сторонние API, OTC-контрагентов или чью-то потерю средств.',
        'Не нарушайте закон в своей юрисдикции. Не преследуйте людей. Не подделывайте демо.',
        'Подавая заявку, вы соглашаетесь с этими условиями. Если что-то неясно — спрашивайте до дедлайна, а не после судейства.',
      ],
    },
    event: {
      title: 'Подайте проект', sub: 'Бесплатно — RSVP / подача через приложение, вход через Telegram.',
      dates: '28 сентября — 12 октября 2026', cta: 'Подать проект', ctaSub: 'Откроет событие Thermopolium в приложении',
      reward: '$1000 в эквиваленте вашего локального ai-стейблкоина — один приз на страну, где есть DAI.',
      chains: 'Стройте на любом блокчейне — Solana, Ethereum, Hydromancer, Base, Tempo, Arbitrum, Zcash, Robinhood Chain — главное использовать DAI хоть как-то.',
    },
    contact: {
      label: 'контакты', title: 'Свяжитесь с нами', sub: 'Вопросы про Thermopolium, DAI Miner или вашу заявку? Напишите нам.',
      name: 'Ваше имя', emailTg: 'Email или Telegram', subject: 'Тема', message: 'Ваше сообщение',
      send: 'Отправить', sending: 'Отправка…', sentTitle: 'Сообщение отправлено!', sentSub: 'Мы скоро свяжемся с вами.', error: 'Что-то пошло не так — попробуйте ещё раз.',
    },
    footer: {
      tagline: 'Сайд-трек рядом с Colosseum. Оцениваем слой локального фиата и AI-агентов, призы — в локальных стейблкоинах.',
      explore: 'Разделы', resources: 'Ресурсы', connect: 'Связь', gifts: 'Подарочные карты',
      rights: '© 2026 Thermopolium × AIHub — сайд-трек Colosseum World\'s Fair.',
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
      submit: 'Подать проект', submitTitle: 'Подать проект',
      subName: 'Ваше имя', subProject: 'Название проекта', subGithub: 'GitHub (репозиторий или профиль)', subX: 'X (ник или ссылка)',
      subTg: 'Telegram (@ник)', subLink: 'Ссылка на проект на Colosseum',
      subColoWait: 'Читаем страницу Colosseum…', subColoReady: 'Данные подтянуты с Colosseum',
      subColoInvalid: 'Вставьте ссылку вида colosseum.com/arena/projects/ваш-проект',
      subColoMissing: 'На Colosseum нет проекта по этой ссылке.',
      subColoDown: 'Colosseum не ответил. Заявку всё равно можно отправить — мы попробуем ещё раз в момент отправки.',
      subBlockchain: 'Блокчейн', subCountry: 'Страна (ваш локальный ai-стейблкоин)',
      subAuthedAs: 'Заявка от {handle} — подтверждено через вход в Telegram',
      subLoginPrompt: 'Войдите через Telegram, чтобы подать проект',
      subDupe: 'Вы уже подавали проект на этот блокчейн с этого Telegram-аккаунта.',
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
    ticket: { brand: 'Thermopolium · Билет', valid: 'действителен', checkedIn: 'использован', notFound: 'Билет не найден.' },
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
    <div className={`inline-flex bg-chip border border-veil rounded-full p-0.5 ${className}`}>
      {LANGS.map(l => (
        <button key={l} onClick={() => setLang(l)}
          className={`px-2.5 py-1 rounded-full font-mono text-[11px] uppercase transition-colors cursor-pointer ${lang === l ? 'font-bold' : 'text-ink-faint hover:text-ink'}`}
          style={lang === l ? { background: 'linear-gradient(100deg, var(--accent), var(--accent-2))', color: 'var(--on-accent, #fff)' } : undefined}>
          {l}
        </button>
      ))}
    </div>
  )
}
