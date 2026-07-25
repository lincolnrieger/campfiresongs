// Campfire song data. Lyrics use light ChordPro syntax: [C] markers sit above
// the syllable that follows. All four songs are traditional / public domain.

export const songs = [
  {
    slug: "i-met-a-bear",
    title: "I Met a Bear",
    by: "Traditional",
    key: "C",
    note: "An echo song — the leader sings each line and everyone echoes it back. No instrument needed.",
    sections: [
      { label: "Verse 1", lines: [
        "[C]The other day,",
        "I met a [G7]bear,",
        "A great big [C]bear,",
        "Oh way out [G7]there.[C]",
      ]},
      { label: "Verse 2", lines: [
        "He [C]looked at me,",
        "I looked at [G7]him,",
        "He sized up [C]me,",
        "I sized up [G7]him.[C]",
      ]},
      { label: "Verse 3", lines: [
        "He [C]said to me,",
        "\"Why don't you [G7]run?",
        "I see you [C]ain't",
        "Got any [G7]gun.\"[C]",
      ]},
      { label: "Verse 4", lines: [
        "And [C]so I ran",
        "Away from [G7]there,",
        "But right be[C]hind",
        "Me was that [G7]bear.[C]",
      ]},
      { label: "Verse 5", lines: [
        "A[C]head of me",
        "There was a [G7]tree,",
        "A great big [C]tree,",
        "Oh glory [G7]be![C]",
      ]},
      { label: "Verse 6", lines: [
        "The [C]lowest branch",
        "Was ten feet [G7]up,",
        "I had to [C]jump",
        "And trust my [G7]luck.[C]",
      ]},
      { label: "Verse 7", lines: [
        "And [C]so I jumped",
        "Into the [G7]air,",
        "But I missed that [C]branch",
        "Away up [G7]there.[C]",
      ]},
      { label: "Verse 8", lines: [
        "But [C]don't you fret,",
        "And don't you [G7]frown,",
        "I caught that [C]branch",
        "On the way back [G7]down.[C]",
      ]},
      { label: "Verse 9", lines: [
        "That's [C]all there is,",
        "There ain't no [G7]more,",
        "Un[C]less I meet",
        "That bear once [G7]more.[C]",
      ]},
    ],
  },
  {
    slug: "ging-gang-goolie",
    title: "Ging Gang Goolie",
    by: "Traditional Scout Song",
    key: "C",
    sections: [
      { label: "Verse", lines: [
        "[C]Ging gang goolie goolie goolie goolie [G7]watcha,",
        "Ging gang [C]goo, ging gang [G7]goo.",
        "[C]Ging gang goolie goolie goolie goolie [G7]watcha,",
        "Ging gang [C]goo, ging gang goo.",
      ]},
      { label: "Verse", lines: [
        "[C]Hayla, hayla shayla, hayla shayla, [G7]hayla, hoo.",
        "[C]Hayla, hayla shayla, hayla shayla, [G7]hayla, hoo.",
        "[C]Shally wally, shally wally, shally wally, shally wally,",
        "[G7]Oompah, oompah, oompah, [C]oompah.",
      ]},
    ],
  },
  {
    slug: "a-peanut-sat-on-a-railway-track",
    title: "A Peanut Sat on a Railway Track",
    by: "Traditional",
    key: "C",
    sections: [
      { label: "Verse", lines: [
        "A [C]peanut sat on a [G7]railway track,",
        "His heart was all a-[C]flutter.",
        "Round the [C]bend came [F]number [C]ten —",
        "Toot, toot! [G7]Peanut [C]butter!",
      ]},
    ],
  },
  {
    slug: "a-ram-sam-sam",
    title: "A Ram Sam Sam",
    by: "Traditional (Morocco)",
    key: "C",
    sections: [
      { label: "Verse", lines: [
        "A [C]ram sam sam, a [G7]ram sam sam,",
        "[C]Guli guli guli guli guli [G7]ram sam [C]sam.",
        "A [C]ram sam sam, a [G7]ram sam sam,",
        "[C]Guli guli guli guli guli [G7]ram sam [C]sam.",
      ]},
      { label: "Verse", lines: [
        "A [F]rafi, a [C]rafi,",
        "[C]Guli guli guli guli guli [G7]ram sam [C]sam.",
        "A [F]rafi, a [C]rafi,",
        "[C]Guli guli guli guli guli [G7]ram sam [C]sam.",
      ]},
    ],
  },
];

export const bySlug = new Map(songs.map((s) => [s.slug, s]));
