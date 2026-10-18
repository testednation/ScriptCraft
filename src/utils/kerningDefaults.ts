import { KerningMap } from '../types/font';

export interface KerningCategory {
  category: string;
  description: string;
  pairs: {
    pair: string;
    suggested: number;
    explanation: string;
  }[];
}

export const STANDARD_KERNING_CATEGORIES: KerningCategory[] = [
  {
    category: 'Diagonal Overhangs',
    description: 'Slanted uppercase strokes that create excessive negative space',
    pairs: [
      { pair: 'AV', suggested: -70, explanation: 'Opposing diagonals leave huge white gap' },
      { pair: 'VA', suggested: -70, explanation: 'V right slant meets A left slant' },
      { pair: 'AW', suggested: -55, explanation: 'A right diagonal meets wide W vertex' },
      { pair: 'WA', suggested: -55, explanation: 'W right vertex meets A left diagonal' },
      { pair: 'AY', suggested: -65, explanation: 'A right diagonal meets Y left stem' },
      { pair: 'YA', suggested: -65, explanation: 'Y diagonal meets A diagonal' },
      { pair: 'AT', suggested: -60, explanation: 'T horizontal bar hangs over A' },
      { pair: 'TA', suggested: -60, explanation: 'T crossbar overhangs A apex' },
    ],
  },
  {
    category: 'Capital T Overhangs',
    description: 'The horizontal crossbar of T creates empty pockets beneath it',
    pairs: [
      { pair: 'Te', suggested: -45, explanation: 'T crossbar tucks over small round e' },
      { pair: 'To', suggested: -45, explanation: 'T crossbar tucks over o circular bowl' },
      { pair: 'Ta', suggested: -40, explanation: 'T crossbar tucks over a' },
      { pair: 'Tr', suggested: -35, explanation: 'T crossbar tucks over r' },
      { pair: 'Ty', suggested: -40, explanation: 'T crossbar tucks over y diagonal' },
      { pair: 'Tu', suggested: -30, explanation: 'T crossbar tucks over u' },
      { pair: 'T.', suggested: -80, explanation: 'Period sits deep beneath T crossbar' },
      { pair: 'T,', suggested: -80, explanation: 'Comma sits deep beneath T crossbar' },
    ],
  },
  {
    category: 'P, F & V Pairs',
    description: 'Open bowls and arms that benefit from tightened optical balance',
    pairs: [
      { pair: 'P.', suggested: -75, explanation: 'Period tucks directly under P bowl' },
      { pair: 'P,', suggested: -75, explanation: 'Comma tucks under P bowl' },
      { pair: 'Pa', suggested: -30, explanation: 'a fits under P curve' },
      { pair: 'Fa', suggested: -40, explanation: 'a sits under F lower bar' },
      { pair: 'Fe', suggested: -35, explanation: 'e sits under F lower bar' },
      { pair: 'Fo', suggested: -35, explanation: 'o sits under F lower bar' },
      { pair: 'Ve', suggested: -45, explanation: 'e fits into V right slant' },
      { pair: 'Vo', suggested: -45, explanation: 'o fits into V right slant' },
      { pair: 'Va', suggested: -45, explanation: 'a fits into V right slant' },
    ],
  },
  {
    category: 'W, Y & L Pairs',
    description: 'Wide uppercase letters and horizontal basebars',
    pairs: [
      { pair: 'We', suggested: -35, explanation: 'e fits beside W diagonal' },
      { pair: 'Wo', suggested: -35, explanation: 'o fits beside W diagonal' },
      { pair: 'Wa', suggested: -35, explanation: 'a fits beside W diagonal' },
      { pair: 'Ye', suggested: -50, explanation: 'e sits under Y right branch' },
      { pair: 'Yo', suggested: -50, explanation: 'o sits under Y right branch' },
      { pair: 'Ya', suggested: -50, explanation: 'a sits under Y right branch' },
      { pair: 'LT', suggested: -65, explanation: 'L base meets T crossbar overhang' },
      { pair: 'LV', suggested: -65, explanation: 'L base meets V left slant' },
      { pair: 'LW', suggested: -55, explanation: 'L base meets W left slant' },
      { pair: 'LY', suggested: -65, explanation: 'L base meets Y left branch' },
    ],
  },
  {
    category: 'Lowercase & Punctuation',
    description: 'Organic cursive and lowercase letter pairings',
    pairs: [
      { pair: 'ry', suggested: -25, explanation: 'r ear tucks over y diagonal' },
      { pair: 'yo', suggested: -20, explanation: 'Tighter rhythm between curves' },
      { pair: 'rc', suggested: -20, explanation: 'r ear tucks into c' },
      { pair: 'rd', suggested: -20, explanation: 'r ear tucks into d ascender' },
      { pair: 'V.', suggested: -65, explanation: 'Period sits deep into V slope' },
      { pair: 'V,', suggested: -65, explanation: 'Comma sits deep into V slope' },
      { pair: 'Y.', suggested: -65, explanation: 'Period sits under Y center stem' },
      { pair: 'Y,', suggested: -65, explanation: 'Comma sits under Y center stem' },
      { pair: 'W.', suggested: -50, explanation: 'Period sits near W vertex' },
    ],
  },
];

export const DEFAULT_INITIAL_KERNING: KerningMap = {
  AV: -70,
  VA: -70,
  AW: -55,
  WA: -55,
  AY: -65,
  YA: -65,
  AT: -60,
  TA: -60,
  Te: -45,
  To: -45,
  Ta: -40,
  Tr: -35,
  Ty: -40,
  Tu: -30,
  'T.': -80,
  'T,': -80,
  'P.': -75,
  'P,': -75,
  Fa: -40,
  Fe: -35,
  Fo: -35,
  Ve: -45,
  Vo: -45,
  Va: -45,
  We: -35,
  Wo: -35,
  Wa: -35,
  Ye: -50,
  Yo: -50,
  Ya: -50,
  LT: -65,
  LV: -65,
  LW: -55,
  LY: -65,
  ry: -25,
  yo: -20,
  'V.': -65,
  'V,': -65,
  'Y.': -65,
  'Y,': -65,
  'W.': -50,
};
