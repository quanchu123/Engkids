// Maps a unit/lesson topic (the English topic key stored in curriculum_units.theme,
// e.g. "food and drinks", "animals") to an open-license OpenMoji illustration in
// /public/illustrations. Artwork: OpenMoji (https://openmoji.org), CC BY-SA 4.0,
// fetched by scripts/fetch-illustrations.mjs. We never fabricate artwork; a topic
// with no mapped file falls back to the generic illustration.

const TOPIC_ILLUSTRATION: Record<string, string> = {
  'food and drinks': '/illustrations/food-and-drinks.svg',
  animals: '/illustrations/animals.svg',
  'plants and trees': '/illustrations/plants-and-trees.svg',
  'body and health': '/illustrations/body-and-health.svg',
  'people and family': '/illustrations/people-and-family.svg',
  'society and groups': '/illustrations/society-and-groups.svg',
  'language and communication': '/illustrations/language-and-communication.svg',
  places: '/illustrations/places.svg',
  'time and calendar': '/illustrations/time-and-calendar.svg',
  'feelings and emotions': '/illustrations/feelings-and-emotions.svg',
  'things and objects': '/illustrations/things-and-objects.svg',
  'nature and the world': '/illustrations/nature-and-the-world.svg',
  'thinking and ideas': '/illustrations/thinking-and-ideas.svg',
  'movement and travel': '/illustrations/movement-and-travel.svg',
  'money and shopping': '/illustrations/money-and-shopping.svg',
  'weather and nature': '/illustrations/weather-and-nature.svg',
  'art and making': '/illustrations/art-and-making.svg',
  'sports and games': '/illustrations/sports-and-games.svg',
  'activities and events': '/illustrations/activities-and-events.svg',
  actions: '/illustrations/actions.svg',
  'social actions': '/illustrations/social-actions.svg',
  'states and being': '/illustrations/states-and-being.svg',
  'senses and perception': '/illustrations/senses-and-perception.svg',
  'qualities and descriptions': '/illustrations/qualities-and-descriptions.svg',
  descriptions: '/illustrations/descriptions.svg',
  'manner words': '/illustrations/manner-words.svg',
  'numbers and measure': '/illustrations/numbers-and-measure.svg',
  shapes: '/illustrations/shapes.svg',
  materials: '/illustrations/materials.svg',
  'daily life': '/illustrations/daily-life.svg',
  school: '/illustrations/school.svg',
  technology: '/illustrations/technology.svg',
  general: '/illustrations/general.svg',
};

const FALLBACK = '/illustrations/general.svg';

// The generator may number a split bucket ("general 2"); strip the suffix before
// lookup so every chunk of a topic shares its illustration.
export function illustrationForTopic(topic: string | null | undefined): string {
  const base = String(topic || '')
    .trim()
    .toLowerCase()
    .replace(/\s+\d+$/, '');
  return TOPIC_ILLUSTRATION[base] || FALLBACK;
}
