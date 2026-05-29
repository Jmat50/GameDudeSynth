/**
 * Regression checks for v2 track role detection and noise routing.
 *
 * Usage: npx vite-node scripts/test-track-analysis.ts
 */
import { TrackAnalyzer, type MIDITrack } from '../src-v2/audio/midi/TrackAnalyzer';
import { RoleAllocator } from '../src-v2/audio/midi/RoleAllocator';
import { ChannelMapper } from '../src-v2/audio/midi/ChannelMapper';
import { midiNoteToDrumHit } from '../src-v2/audio/midi/drumNoteMap';

const analyzer = new TrackAnalyzer();
const allocator = new RoleAllocator();
const mapper = new ChannelMapper();

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`OK: ${message}`);
}

function staccatoGuitarTrack(): MIDITrack {
  const notes = [];
  for (let i = 0; i < 80; i++) {
    notes.push({
      midi: 40 + (i % 5),
      time: i * 0.08,
      duration: 0.04,
      velocity: 90,
    });
  }
  return { channel: 0, name: 'Rhythm Guitar', notes };
}

function vocalLeadTrack(): MIDITrack {
  const notes = [];
  for (let i = 0; i < 40; i++) {
    notes.push({
      midi: 64 + (i % 7),
      time: i * 0.35,
      duration: 0.3,
      velocity: 100,
    });
  }
  return { channel: 1, name: 'Vocals', notes };
}

function gmDrumTrack(): MIDITrack {
  const notes = [];
  const pitches = [36, 38, 42, 46, 49];
  for (let i = 0; i < 60; i++) {
    notes.push({
      midi: pitches[i % pitches.length],
      time: i * 0.12,
      duration: 0.05,
      velocity: 110,
    });
  }
  return { channel: 9, name: 'Drums', notes };
}

function multiLeadTracks(): MIDITrack[] {
  return [0, 1, 2].map(idx => ({
    channel: idx + 2,
    name: `Melody ${idx + 1}`,
    notes: Array.from({ length: 30 }, (_, i) => ({
      midi: 70 + idx,
      time: i * 0.25,
      duration: 0.2,
      velocity: 95,
    })),
  }));
}

// Staccato non-drum track must not receive drums role after allocation
{
  const raw = analyzer.analyzeTracks([staccatoGuitarTrack()]);
  const allocated = allocator.allocate(raw);
  const guitar = allocated[0];
  assert(guitar.role !== 'drums', 'staccato guitar is not classified as drums');
  const { assignments } = mapper.mapTracks([staccatoGuitarTrack()]);
  assert(
    !assignments.some(a => a.channelId === 'n1' || a.channelId === 'n2'),
    'staccato guitar is not routed to noise channels'
  );
}

// GM drum channel maps to noise with shaped hits
{
  const { assignments } = mapper.mapTracks([gmDrumTrack()]);
  assert(assignments.length === 1, 'drum track is mapped');
  assert(
    assignments[0].channelId === 'n1' || assignments[0].channelId === 'n2',
    'GM drums use noise channel'
  );
  assert(midiNoteToDrumHit(36) === 'kick', 'kick GM note maps to kick hit');
  assert(midiNoteToDrumHit(38) === 'snare', 'snare GM note maps to snare hit');
}

// Exactly one primary lead on dense melodic MIDI
{
  const tracks = [vocalLeadTrack(), ...multiLeadTracks()];
  const allocated = allocator.allocate(analyzer.analyzeTracks(tracks));
  const leads = allocated.filter(a => a.role === 'lead' && !a.muted);
  const primary = allocated.filter(a => a.isPrimaryLead);
  assert(leads.length === 1, 'only one lead role after election');
  assert(primary.length === 1, 'exactly one primary lead flagged');
  assert(
    primary[0].trackName?.toLowerCase().includes('vocal') ?? false,
    'vocal-named track wins lead election'
  );
}

console.log('\nAll track analysis regression checks passed.');
