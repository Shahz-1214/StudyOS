import {
  Sigma, Atom, FlaskConical, Dna, Code2, Languages, Landmark,
  Palette, Music, Microscope, BookOpen,
} from "lucide-react";

// Deterministic subject → icon mapping (no AI, plain keyword matching).
// Used for restrained subject identity: icon accent only, never a full card.
const ICON_RULES = [
  { re: /math|algebra|calcul|statistic|trig|arith/, Icon: Sigma },
  { re: /physic/, Icon: Atom },
  { re: /chem/, Icon: FlaskConical },
  { re: /bio|botany|zoolog/, Icon: Dna },
  { re: /comput|coding|program|informat|software|it\b/, Icon: Code2 },
  { re: /english|urdu|language|literat|french|german|spanish|arabic|chinese|hindi/, Icon: Languages },
  { re: /history|civic|geograph|econom|account|business|studies|sociolog|psycholog|islam/, Icon: Landmark },
  { re: /art|design|draw/, Icon: Palette },
  { re: /music/, Icon: Music },
  { re: /science/, Icon: Microscope },
];

export function subjectIcon(name = "") {
  const n = String(name).toLowerCase();
  for (const rule of ICON_RULES) {
    if (rule.re.test(n)) return rule.Icon;
  }
  return BookOpen;
}