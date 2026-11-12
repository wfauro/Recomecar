export type PassageLength = "curta" | "media" | "longa";

export type PassageTheme =
  | "desanimo"
  | "incerteza"
  | "culpa"
  | "recomeco";

export type Passage = {
  id: string;
  reference: string;
  book: string;
  chapter: number;
  start: number;
  end: number;
  verses: string;
  tags: string[];
  fallback?: string;
};

export const passageCatalog: Record<
  PassageTheme,
  Record<PassageLength, Passage[]>
> = {
  desanimo: {
    curta: [
      {
        id: "galatas-6-9",
        reference: "Gálatas 6:9",
        book: "GAL",
        chapter: 6,
        start: 9,
        end: 9,
        verses: "9",
        tags: ["desânimo", "cansaço espiritual", "perseverança"],
      },
    ],

    media: [
      {
        id: "mateus-11-28-30",
        reference: "Mateus 11:28-30",
        book: "MAT",
        chapter: 11,
        start: 28,
        end: 30,
        verses: "28-30",
        tags: ["descanso", "sobrecarga", "acolhimento"],
      },
    ],

    longa: [
      {
        id: "1-reis-19-4-8",
        reference: "1 Reis 19:4-8",
        book: "1KI",
        chapter: 19,
        start: 4,
        end: 8,
        verses: "4-8",
        tags: ["exaustão", "cuidado", "descanso"],
      },
    ],
  },

  incerteza: {
    curta: [
      {
        id: "proverbios-3-5-6",
        reference: "Provérbios 3:5-6",
        book: "PRO",
        chapter: 3,
        start: 5,
        end: 6,
        verses: "5-6",
        tags: ["direção", "confiança", "decisão"],
      },
    ],

    media: [
      {
        id: "salmo-25-4-5",
        reference: "Salmo 25:4-5",
        book: "PSA",
        chapter: 25,
        start: 4,
        end: 5,
        verses: "4-5",
        tags: ["direção", "caminho", "verdade"],
      },
    ],

    longa: [
      {
        id: "proverbios-2-1-9",
        reference: "Provérbios 2:1-9",
        book: "PRO",
        chapter: 2,
        start: 1,
        end: 9,
        verses: "1-9",
        tags: ["sabedoria", "discernimento", "direção"],
      },
    ],
  },

  culpa: {
    curta: [
      {
        id: "romanos-8-1",
        reference: "Romanos 8:1",
        book: "ROM",
        chapter: 8,
        start: 1,
        end: 1,
        verses: "1",
        tags: ["culpa", "vergonha", "graça", "acolhimento"],
        fallback:
          "Portanto, agora já não há condenação para os que estão em Cristo Jesus.",
      },
    ],

    media: [
      {
        id: "salmo-103-10-12",
        reference: "Salmo 103:10-12",
        book: "PSA",
        chapter: 103,
        start: 10,
        end: 12,
        verses: "10-12",
        tags: ["misericórdia", "perdão", "restauração"],
      },
    ],

    longa: [
      {
        id: "lucas-15-11-24",
        reference: "Lucas 15:11-24",
        book: "LUK",
        chapter: 15,
        start: 11,
        end: 24,
        verses: "11-24",
        tags: ["recomeço", "acolhimento", "perdão"],
      },
    ],
  },

  recomeco: {
    curta: [
      {
        id: "lamentacoes-3-22-23",
        reference: "Lamentações 3:22-23",
        book: "LAM",
        chapter: 3,
        start: 22,
        end: 23,
        verses: "22-23",
        tags: ["recomeço", "esperança", "fidelidade"],
        fallback:
          "Os seus amores nunca se esgotam, as suas misericórdias não têm fim; renovam-se cada manhã; grande é a sua fidelidade.",
      },
    ],

    media: [
      {
        id: "filipenses-3-13-14",
        reference: "Filipenses 3:13-14",
        book: "PHP",
        chapter: 3,
        start: 13,
        end: 14,
        verses: "13-14",
        tags: ["recomeço", "direção", "perseverança"],
      },
    ],

    longa: [
      {
        id: "isaias-43-18-19",
        reference: "Isaías 43:18-19",
        book: "ISA",
        chapter: 43,
        start: 18,
        end: 19,
        verses: "18-19",
        tags: ["recomeço", "novidade", "esperança"],
      },
    ],
  },
};

export function getPassageLength(level: "2" | "10" | "calma"): PassageLength {
  if (level === "2") return "curta";
  if (level === "10") return "media";
  return "longa";
}

export function getThemeForProtocol(
  protocol: "alivio" | "mapa" | "constrangimento" | "proximo",
): PassageTheme {
  switch (protocol) {
    case "alivio":
      return "desanimo";
    case "mapa":
      return "incerteza";
    case "constrangimento":
      return "culpa";
    case "proximo":
      return "recomeco";
  }
}

export function getPassage(
  level: "2" | "10" | "calma",
  protocol: "alivio" | "mapa" | "constrangimento" | "proximo",
): Passage {
  const theme = getThemeForProtocol(protocol);
  const length = getPassageLength(level);
  const passages = passageCatalog[theme][length];

  if (passages.length === 0) {
    throw new Error(
      `Nenhuma passagem cadastrada para o tema "${theme}" e duração "${length}".`,
    );
  }

  return passages[0];
}