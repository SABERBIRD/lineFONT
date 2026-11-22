import { layout } from "@saberbird/linefont";
import font from "@saberbird/linefont/fonts/bagling-ua-en";

const fonts = [font];
const result = layout(fonts, {
  text: "Ґрунт / Ground",
  height: 4,
  lineHeight: 7.2,
  top: 1.2,
});
console.log(result.glyphs.length, result.missing); // 14 []
