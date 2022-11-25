const receipt: [[number, number, number], string][] = [
  [[1, 2, 5], "glas aardbeiensap"],
  [[3, 3, 2], "pistolet pesto/tomaat"],
  [[3, 4, 5], "sinaasappel"],
  [[3, 0, 1], "pistolet kaas"],
  [[2, 4, 5], "appel"],
  [[4, 3, 7], "glas appel-ananassap"],
];

const charAt = (text: string, index: number) => text.replace(" ", "").at(index - 1);

for (const [[unid, deci, cent], item] of receipt) {
  console.log(`${charAt(item, unid)} ${charAt(item, deci)} ${charAt(item, cent)}`);
}
