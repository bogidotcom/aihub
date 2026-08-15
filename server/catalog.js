// Single source of truth for prices — checkout amounts are always taken from
// here on the server, never from the client.

export const YOGA_PACKAGES = {
  test: { key: 'test', title: 'Test class', classes: 1, kgs: 5000, usdt: '57' },
  p4: { key: 'p4', title: '4 classes', classes: 4, kgs: 18000, usdt: '207' },
  p8: { key: 'p8', title: '8 classes', classes: 8, kgs: 35000, usdt: '402' },
  p12: { key: 'p12', title: '12 classes', classes: 12, kgs: 50000, usdt: '575' },
}

export const YOGA_SLOTS = {
  sunrise: { key: 'sunrise', title: 'Sunrise', time: '8:00 AM' },
  sunset: { key: 'sunset', title: 'Sunset', time: '8:00 PM' },
}

export const VIBECODING_PROGRAMS = {
  tryout: {
    key: 'tryout', title: 'Try it out', format: 'Group · RU/ENG',
    duration: '1 month', schedule: '3 classes a week · 2 hours per class',
    kgs: 25000, usdt: '287',
    perks: ['AI-native thinking foundations', 'Automate your own workflow', 'Group flow sessions'],
  },
  resident: {
    key: 'resident', title: 'Resident', format: 'Group · RU/ENG',
    duration: '3 months', schedule: '3 classes a week · 2 hours per class',
    kgs: 50000, usdt: '575',
    perks: ['Everything in Try it out', 'Commercial project access — get real clients', 'Portfolio + delivery experience'],
  },
  individual: {
    key: 'individual', title: 'Individual', format: '1-on-1 · any language',
    duration: 'Any schedule, idea and load', schedule: 'Per 2 hour session',
    kgs: 5000, usdt: '57',
    perks: ['Your idea, your pace', 'Custom curriculum', 'Direct mentorship'],
  },
}

export const GIFT_KINDS = ['yoga_package', 'vibecoding', 'custom']
