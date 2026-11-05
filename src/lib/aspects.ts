// Shared Aspect & Highlight Tag Defaults and Parsers for ReviewSpark

export const DEFAULT_ASPECTS: string[] = [
  '🍲 Food',
  '🤝 Service',
  '✨ Ambience',
  '✦ Value for money',
  '🧹 Cleanliness',
];

export const DEFAULT_HIGHLIGHT_TAGS: string[] = [
  'Outstanding Taste',
  'Fresh & Flavorful',
  'Memorable Experience',
  'Friendly Staff',
  'Great Value',
  'Hygienic & Clean',
];

export interface ParsedAspectItem {
  key: string;
  label: string;
  icon: string;
}

export function parseAspectItem(raw: string, idx: number = 0): ParsedAspectItem {
  if (!raw || typeof raw !== 'string') {
    return { key: `asp_${idx}`, label: 'Quality', icon: '✨' };
  }

  // Regex checks for leading emoji / symbol followed by text
  const match = raw.match(/^(\p{Emoji_Presentation}|\p{Extended_Pictographic}|[^\w\s])\s*(.+)$/u);
  if (match) {
    const icon = match[1];
    const label = match[2].trim();
    return {
      key: `asp_${idx}_${label.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
      label,
      icon,
    };
  }

  const lower = raw.toLowerCase();
  let icon = '✨';
  if (lower.includes('food') || lower.includes('taste') || lower.includes('dish') || lower.includes('menu') || lower.includes('meal')) icon = '🍲';
  else if (lower.includes('service') || lower.includes('support') || lower.includes('hospitality')) icon = '🤝';
  else if (lower.includes('staff') || lower.includes('behaviour') || lower.includes('team') || lower.includes('doctor') || lower.includes('trainer')) icon = '👥';
  else if (lower.includes('ambien') || lower.includes('decor') || lower.includes('vibe') || lower.includes('atmospher') || lower.includes('interior')) icon = '✨';
  else if (lower.includes('clean') || lower.includes('hygien') || lower.includes('sanit')) icon = '🧹';
  else if (lower.includes('value') || lower.includes('price') || lower.includes('cost') || lower.includes('money') || lower.includes('afford') || lower.includes('pocket')) icon = '✦';
  else if (lower.includes('speed') || lower.includes('fast') || lower.includes('quick') || lower.includes('delivery')) icon = '⚡';
  else if (lower.includes('park') || lower.includes('car')) icon = '🚗';
  else if (lower.includes('drink') || lower.includes('beverag') || lower.includes('bar') || lower.includes('cocktail') || lower.includes('coffee') || lower.includes('tea')) icon = '🍹';
  else if (lower.includes('music') || lower.includes('sound') || lower.includes('dj')) icon = '🎵';
  else if (lower.includes('time') || lower.includes('punctual')) icon = '⏱️';
  else if (lower.includes('safety') || lower.includes('secure')) icon = '🛡️';
  else if (lower.includes('equip') || lower.includes('machine') || lower.includes('tool')) icon = '🏋️';

  return {
    key: `asp_${idx}_${lower.replace(/[^a-z0-9]/g, '_')}`,
    label: raw.trim(),
    icon,
  };
}
