import json
from pathlib import Path
from html import escape

ROOT = Path(__file__).resolve().parent
glyphs = {}
def add(char, path, advance=10):
    glyphs[char] = {'advance': advance, 'path': path}

upper = {
'A': 'M1 10 L5 0 L9 10 M2.6 6 H7.4',
'B': 'M1 10 V0 H5.4 C9.5 0 9.5 4.8 5.4 4.8 H1 M5.4 4.8 C10 4.8 10 10 5.4 10 H1',
'C': 'M9 1.2 C7 -1 1 -0.4 1 5 C1 10.4 7 11 9 8.8',
'D': 'M1 10 V0 H4.5 C11 0 11 10 4.5 10 H1',
'E': 'M9 0 H1 V10 H9 M1 4.8 H7.3',
'F': 'M9 0 H1 V10 M1 4.8 H7.3',
'G': 'M9 1.2 C7 -1 1 -0.4 1 5 C1 10.4 7 11 9 8 V5.5 H5.6',
'H': 'M1 0 V10 M9 0 V10 M1 5 H9',
'I': 'M1 0 H7 M4 0 V10 M1 10 H7',
'J': 'M2 0 H9 V7 C9 11 1 11 1 7',
'K': 'M1 0 V10 M9 0 L1 6 M4.5 3.4 L9.2 10',
'L': 'M1 0 V10 H9',
'M': 'M1 10 V0 L5 6 L9 0 V10',
'N': 'M1 10 V0 L9 10 V0',
'O': 'M5 0 C-0.4 0 -0.4 10 5 10 C10.4 10 10.4 0 5 0',
'P': 'M1 10 V0 H5.5 C10.2 0 10.2 5.3 5.5 5.3 H1',
'Q': 'M5 0 C-0.4 0 -0.4 10 5 10 C10.4 10 10.4 0 5 0 M6 7 L10 11',
'R': 'M1 10 V0 H5.5 C10.2 0 10.2 5.3 5.5 5.3 H1 M5.2 5.3 L9.4 10',
'S': 'M8.8 1 C5.8 -1.2 1 -0.1 1 2.5 C1 6 9 3.6 9 7.4 C9 10.2 4 11.2 1 9',
'T': 'M0.5 0 H9.5 M5 0 V10',
'U': 'M1 0 V6.8 C1 11.1 9 11.1 9 6.8 V0',
'V': 'M0.6 0 L5 10 L9.4 0',
'W': 'M0.5 0 L3 10 L6 2 L9 10 L11.5 0',
'X': 'M1 0 L9 10 M9 0 L1 10',
'Y': 'M0.8 0 L5 5.4 L9.2 0 M5 5.4 V10',
'Z': 'M1 0 H9 L1 10 H9',
}
for char, path in upper.items(): add(char, path, 12.5 if char == 'W' else 9 if char == 'I' else 10.5)
lower = {
'a': 'M7 3 V10 M7 4.5 C5 1.8 1 2.5 1 6.5 C1 10.5 5 11.2 7 8.5',
'b': 'M1 0 V10 M1 4.5 C3 1.8 7.5 2.5 7.5 6.5 C7.5 10.5 3 11.2 1 8.5',
'c': 'M7 3.8 C4.8 1.7 1 3 1 6.5 C1 10 4.8 11.3 7 9.2',
'd': 'M7 0 V10 M7 4.5 C5 1.8 1 2.5 1 6.5 C1 10.5 5 11.2 7 8.5',
'e': 'M1 6.3 H7 C7 1.7 1 1.8 1 6.5 C1 10.5 5 11.2 7.2 9',
'f': 'M2.5 10 V2 C2.5 -0.5 5.2 -0.6 6.5 0.4 M0.5 3.2 H5.8',
'g': 'M7 3 V10.7 C7 14.2 2 14.2 1 12 M7 4.5 C5 1.8 1 2.5 1 6.5 C1 10.5 5 11.2 7 8.5',
'h': 'M1 0 V10 M1 5 C2.8 2.1 7 2.3 7 5.5 V10',
'i': 'M2 3 V10 M2 0.4 V0.6',
'j': 'M3 3 V11.3 C3 13.7 0.5 14 -0.3 12.8 M3 0.4 V0.6',
'k': 'M1 0 V10 M7 3 L1 7 M3.8 5.2 L7.5 10',
'l': 'M2 0 V8.7 Q2 10.3 4 10',
'm': 'M1 10 V3 M1 5 C2.2 2.2 5.5 2.2 5.5 5.5 V10 M5.5 5 C6.7 2.2 10 2.2 10 5.5 V10',
'n': 'M1 10 V3 M1 5 C2.8 2.1 7 2.3 7 5.5 V10',
'o': 'M4.4 3 C-0.2 3 -0.2 10 4.4 10 C9 10 9 3 4.4 3',
'p': 'M1 13.5 V3 M1 4.5 C3 1.8 7.5 2.5 7.5 6.5 C7.5 10.5 3 11.2 1 8.5',
'q': 'M7 13.5 V3 M7 4.5 C5 1.8 1 2.5 1 6.5 C1 10.5 5 11.2 7 8.5',
'r': 'M1 10 V3 M1 5 C2.5 2.6 4.5 2.5 6 3.5',
's': 'M6.7 3.6 C4.5 2.2 1 2.8 1 4.6 C1 7 7 5.2 7 8 C7 10.3 3 10.8 0.8 9.3',
't': 'M3 0.7 V8 C3 10.4 5.3 10.5 6.5 9.6 M0.6 3.2 H6.2',
'u': 'M1 3 V7.5 C1 10.9 5.2 10.7 7 8 V3 M7 8 V10',
'v': 'M0.6 3 L4 10 L7.4 3',
'w': 'M0.5 3 L2.8 10 L5.5 3.5 L8.2 10 L10.5 3',
'x': 'M1 3 L7 10 M7 3 L1 10',
'y': 'M0.7 3 L4 10 M7.5 3 L3.7 11.7 Q2.7 14 0.5 13',
'z': 'M1 3 H7 L1 10 H7',
}
for char, path in lower.items(): add(char, path, 11.5 if char == 'm' else 12 if char == 'w' else 4.8 if char in 'il' else 5 if char == 'j' else 7.5 if char in 'frt' else 9)
for char, latin in {'А':'A','В':'B','Е':'E','І':'I','К':'K','М':'M','Н':'H','О':'O','Р':'P','С':'C','Т':'T','Х':'X'}.items(): glyphs[char] = dict(glyphs[latin])
ua_upper = {
'Б': 'M9 0 H1 V10 H5.4 C10.2 10 10.2 4.8 5.4 4.8 H1',
'Г': 'M1 10 V0 H9',
'Ґ': 'M1 10 V0 H9 V-2',
'Д': 'M0.5 12 V10 H10 V12 M1.5 10 C3.3 7.8 3.1 3 3.1 0 H8.3 V10',
'Є': 'M9 1.2 C7 -1 1 -0.4 1 5 C1 10.4 7 11 9 8.8 M1 5 H7.3',
'Ж': 'M1 0 L5 5 L1 10 M9 0 L5 5 L9 10 M5 0 V10',
'З': 'M1 1 C4 -1 9 -0.1 9 2.5 C9 4.7 6.8 5 4.7 5 M4.7 5 C10.3 4.8 10.7 11 4.5 10 C3 10 1.8 9.6 1 9',
'И': 'M1 0 V10 L9 0 V10',
'Ї': 'M1 0 H7 M4 0 V10 M1 10 H7 M2 -2.4 V-2.2 M6 -2.4 V-2.2',
'Й': 'M1 0 V10 L9 0 V10 M2.7 -2.7 Q5 -0.4 7.3 -2.7',
'Л': 'M0.5 10 C2.5 10 2.7 8 3 5 L3.5 0 H9 V10',
'П': 'M1 10 V0 H9 V10',
'У': 'M0.7 0 L5 6.5 M9.2 0 L4.2 8.4 Q3.1 10.7 1 10',
'Ф': 'M5 -1 V11 M5 1.2 C-0.9 1.2 -0.9 8.8 5 8.8 C10.9 8.8 10.9 1.2 5 1.2',
'Ц': 'M1 0 V10 H9 V0 M9 10 H10 V12',
'Ч': 'M1 0 V3.5 C1 6.5 6.5 6.5 9 3.5 M9 0 V10',
'Ш': 'M1 0 V10 H9 V0 M5 0 V10',
'Щ': 'M1 0 V10 H9 V0 M5 0 V10 M9 10 H10 V12',
'Ь': 'M1 0 V10 H5.4 C10.2 10 10.2 4.8 5.4 4.8 H1',
'Ю': 'M1 0 V10 M1 5 H4 M8 0 C2.6 0 2.6 10 8 10 C13.4 10 13.4 0 8 0',
'Я': 'M9 10 V0 H4.5 C-0.2 0 -0.2 5.3 4.5 5.3 H9 M4.8 5.3 L0.6 10',
}
for char, path in ua_upper.items(): add(char, path, 14 if char == 'Ю' else 12 if char in 'ДЦЩ' else 9 if char == 'Ї' else 10.5)
for char, latin in {'а':'a','е':'e','і':'i','к':'k','о':'o','р':'p','с':'c','х':'x'}.items(): glyphs[char] = dict(glyphs[latin])
ua_lower = {
'б': 'M7 0 C6.1 1.7 3 0.4 1.8 3.5 C0.9 5.5 0.3 10 4.4 10 C9 10 9 3.1 4.4 3.1 C2.8 3.1 1.6 4.2 1.2 5.6',
'в': 'M1 10 V3 H4.4 C8.1 3 8.1 6.3 4.4 6.3 H1 M4.4 6.3 C8.9 6.3 8.9 10 4.4 10 H1',
'г': 'M1 10 V3 H7',
'ґ': 'M1 10 V3 H7 V1',
'д': 'M0.3 12 V10 H8.7 V12 M1.3 10 C2.9 8.1 2.7 5.3 2.7 3 H7 V10',
'є': 'M7 3.8 C4.8 1.7 1 3 1 6.5 C1 10 4.8 11.3 7 9.2 M1 6.5 H5.8',
'ж': 'M0.7 3 L4.7 6.5 L0.7 10 M8.7 3 L4.7 6.5 L8.7 10 M4.7 3 V10',
'з': 'M1 3.7 C3 2.3 7 2.7 7 4.6 C7 6 5.3 6.5 3.6 6.5 M3.6 6.5 C8.4 6.3 8.4 10 4 10 C2.7 10 1.5 9.7 0.8 9.2',
'и': 'M1 3 V10 L7 3 V10',
'ї': 'M3.2 3 V10 M1.2 0.4 V0.6 M5.2 0.4 V0.6',
'й': 'M1 3 V10 L7 3 V10 M1.8 0.3 Q4 2.3 6.2 0.3',
'л': 'M0.4 10 C2.4 10 2.4 7.8 2.8 5.5 L3.2 3 H7.7 V10',
'м': 'M1 10 V3 L4.5 7.5 L8 3 V10',
'н': 'M1 3 V10 M7 3 V10 M1 6.5 H7',
'п': 'M1 10 V3 H7 V10',
'т': 'M0.3 3 H8 M4.2 3 V10',
'у': 'M0.7 3 L4 10 M7.5 3 L3.7 11.7 Q2.7 14 0.5 13',
'ф': 'M5 0 V13.5 M5 3 C-0.5 3 -0.5 10 5 10 C10.5 10 10.5 3 5 3',
'ц': 'M1 3 V10 H7 V3 M7 10 H8 V12',
'ч': 'M1 3 V5.2 C1 7.7 5.1 7.7 7 5.2 M7 3 V10',
'ш': 'M1 3 V10 H9 V3 M5 3 V10',
'щ': 'M1 3 V10 H9 V3 M5 3 V10 M9 10 H10 V12',
'ь': 'M1 3 V10 H4.4 C8.8 10 8.8 6.3 4.4 6.3 H1',
'ю': 'M1 3 V10 M1 6.5 H4 M7.4 3 C2.8 3 2.8 10 7.4 10 C12 10 12 3 7.4 3',
'я': 'M7 10 V3 H3.8 C0 3 0 6.8 3.8 6.8 H7 M3.8 6.8 L0.8 10',
}
for char, path in ua_lower.items(): add(char, path, 13 if char == 'ю' else 11.5 if char in 'шщ' else 10.5 if char in 'жмф' else 10 if char in 'дц' else 7 if char == 'ї' else 9)
numbers = {
'0': 'M5 0 C-0.1 0 -0.1 10 5 10 C10.1 10 10.1 0 5 0 M2 8.5 L8 1.5',
'1': 'M2 2 L5 0 V10 M2 10 H8',
'2': 'M1 2.2 C1 -1.1 9 -1.1 9 2.4 C9 5 5 6 1 10 H9',
'3': 'M1 1 C4 -1 9 -0.1 9 2.5 C9 4.7 6.8 5 4.7 5 M4.7 5 C10.3 4.8 10.7 11 4.5 10 C3 10 1.8 9.6 1 9',
'4': 'M7.2 10 V0 L0.8 6.8 H9.3',
'5': 'M9 0 H1.5 L1 4.8 C3.2 3.5 9 3.5 9 7.2 C9 10.8 3.4 10.9 1 9',
'6': 'M8.3 0.7 C2 -1.8 -0.1 4.3 1.4 8.2 C2.9 11.8 9 10.3 9 7 C9 3 2.5 3 1.1 6',
'7': 'M1 0 H9 L3 10 M3.3 5 H7.3',
'8': 'M5 4.8 C0.2 4.8 0.2 0 5 0 C9.8 0 9.8 4.8 5 4.8 C-0.5 4.8 -0.5 10 5 10 C10.5 10 10.5 4.8 5 4.8',
'9': 'M1.7 9.3 C8 11.8 10.1 5.7 8.6 1.8 C7.1 -1.8 1 -0.3 1 3 C1 7 7.5 7 8.9 4',
}
for char,path in numbers.items(): add(char,path,10.5)
marks = {
',': ('M2 9.6 Q3 11.3 1 12.5',4.5),
'.': ('M2 9.7 V10',4.5),
'?': ('M1 2 C1 -1 8 -0.8 8 2.4 C8 4.6 4.5 4.6 4.5 7 M4.5 9.7 V10',9.5),
'!': ('M2 0 V7 M2 9.7 V10',4.5),
':': ('M2 4 V4.3 M2 9.7 V10',4.5),
'-': ('M1 6 H7',9),
'_': ('M0.5 11 H8.5',10),
'+': ('M1 5 H9 M5 1 V9',10.5),
'/': ('M0.5 11 L8.5 -1',10),
'*': ('M5 1 V9 M1.5 3 L8.5 7 M1.5 7 L8.5 3',10.5),
'=': ('M1 3.5 H9 M1 7 H9',10.5),
'~': ('M0.6 6 C3 1 6.5 10 9.2 5',10.5),
'•': ('M3.8 5.6 A0.6 0.6 0 1 0 5 5.6 A0.6 0.6 0 1 0 3.8 5.6',8),
'(': ('M5 0 C0.6 3 0.6 7 5 10',7),
')': ('M1 0 C5.4 3 5.4 7 1 10',7),
'%': ('M1 10 L9 0 M3 0 C0.1 0 0.1 4 3 4 C5.9 4 5.9 0 3 0 M7 6 C4.1 6 4.1 10 7 10 C9.9 10 9.9 6 7 6',11),
"'": ('M2 0 V2.7',4.5),
'"': ('M1.5 0 V2.7 M5 0 V2.7',7),
'$': ('M8.8 1.4 C5.8 -0.8 1 0.3 1 2.8 C1 6.1 9 3.9 9 7.3 C9 10 4 10.8 1 8.7 M5 -1.5 V11.5',10.5),
'₴': ('M1.2 1.4 C4.2 -0.8 9 0.3 9 2.8 C9 5.5 1 4.6 1 7.3 C1 10 6 10.8 8.8 8.7 M0 4.5 H10 M0 6.3 H10',11.5),
'#': ('M3.5 0 L1.5 10 M8.2 0 L6.2 10 M0.8 3.3 H10 M0 6.7 H9.2',11.5),
'@': ('M8 3.5 L7.3 7 C6.2 10 2.8 8.8 3.6 5.5 C4.3 2.4 7.8 2.9 8 4.4 M7.3 7 C6.7 10.1 11.2 8.8 11.2 4.6 C11.2 -0.5 2.5 -1.5 0.7 4.4 C-1.2 10.7 7.3 13.3 10.6 10',13),
'’': ('M3.2 0 Q3.7 1.6 1.5 2.8',5),
'—': ('M0.5 6 H13.5',15),
';': ('M2 4 V4.3 M2 9.6 Q3 11.3 1 12.5',4.5),
}
for char,(path,advance) in marks.items(): add(char,path,advance)
add(' ','',5)

ua='Гей, хлопці, не вспію — на ґанку ваша файна їжа знищується бурундучком.'
en='The quick brown fox jumps over the lazy dog.'
alphabet_ua='АБВГҐДЕЄЖЗИІЇЙКЛМНОПРСТУФХЦЧШЩЬЮЯ'
alphabet_en='ABCDEFGHIJKLMNOPQRSTUVWXYZ'
required=alphabet_ua+alphabet_ua.lower()+alphabet_en+alphabet_en.lower()+'0123456789'+',.?!:-_+/*=~•()%\'"$₴#@'
assert not (set(required)-glyphs.keys())
assert not (set(alphabet_ua.lower())-set(ua.lower()))
assert not (set(alphabet_en.lower())-set(en.lower()))

(ROOT/'glyphs.json').write_text(json.dumps({'name':'Bagling Single Line 01','version':'0.1','capHeight':10,'xHeight':7,'baseline':10,'descender':3.5,'glyphs':glyphs},ensure_ascii=False,indent=2)+'\n')

def strokes(text,x,y,scale=8,color='#253b49',weight=.23):
    out=[]
    for char in text:
        g=glyphs[char]
        if g['path']:
            out.append(f'<path d="{g["path"]}" transform="translate({x:.3f} {y:.3f}) scale({scale})"/>')
        x+=g['advance']*scale
    return f'<g fill="none" stroke="{color}" stroke-width="{weight}" stroke-linecap="round" stroke-linejoin="round">'+''.join(out)+'</g>'

def label(text,x,y,size=24,color='#64747d'):
    return f'<text x="{x}" y="{y}" fill="{color}" font-family="Arial,sans-serif" font-size="{size}" letter-spacing="2">{escape(text)}</text>'

def base(title,subtitle):
    return [f'<svg xmlns="http://www.w3.org/2000/svg" width="3840" height="2160" viewBox="0 0 3840 2160"><rect width="3840" height="2160" fill="#fbfaf7"/>',
    '<defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#dde4e4" stroke-width="1"/></pattern></defs>',
    '<rect x="112" y="250" width="3616" height="1790" fill="url(#grid)" opacity=".34"/>',
    label('BAGLING / SINGLE LINE 01',160,105,28,'#a36542'),label(title,160,177,44,'#253b49'),label(subtitle,160,225,22)]

a=base('УКРАЇНСЬКА + ENGLISH · ПАНГРАМИ','Один штрих = одна траєкторія · всі літери обох абеток · великі та малі')
a += [label('01 / УКРАЇНСЬКА — ВЕЛИКІ',160,310)]
for text,y in [('ГЕЙ, ХЛОПЦІ, НЕ ВСПІЮ — НА ҐАНКУ',365),('ВАША ФАЙНА ЇЖА ЗНИЩУЄТЬСЯ БУРУНДУЧКОМ.',515)]:
    a.append(strokes(text,160,y,8))
a += [label('02 / УКРАЇНСЬКА — МАЛІ',160,745)]
for text,y in [('гей, хлопці, не вспію — на ґанку',800),('ваша файна їжа знищується бурундучком.',955)]:
    a.append(strokes(text,160,y,8.7))
a += [label('03 / ENGLISH — UPPERCASE',160,1210),strokes(en.upper(),160,1270,7.5),label('04 / ENGLISH — LOWERCASE',160,1500),strokes(en.lower(),160,1560,8.7)]
a += ['<path d="M160 1780H3680" stroke="#d8dedc"/>',label('АБЕТКИ / ПЕРЕВІРКА ПОКРИТТЯ',160,1840,21)]
a += [strokes(alphabet_ua,160,1880,3.6),strokes(alphabet_en,1670,1880,3.6),strokes(alphabet_ua.lower(),160,1990,3.6),strokes(alphabet_en.lower(),1670,1990,3.6)]
a += ['</svg>']
(ROOT/'pangrams.svg').write_text(''.join(a))

b=['<svg xmlns="http://www.w3.org/2000/svg" width="3840" height="2160" viewBox="0 0 3840 2160"><rect width="3840" height="2160" fill="#fbfaf7"/>']
rows=[('0123456789',210,15),(', . ? ! :'.replace(' ',''),570,18),('- _ + / * = ~'.replace(' ',''),930,18),('• ( ) % \' "'.replace(' ',''),1290,19),('$ ₴ # @'.replace(' ',''),1650,21)]
for text,y,scale in rows:
    cell=3480/len(text)
    for i,char in enumerate(text):
        x=180+i*cell+(cell-glyphs[char]['advance']*scale)/2
        b.append(strokes(char,x,y,scale,weight=.16))
    b.append(f'<path d="M180 {y+scale*14+28}H3660" stroke="#dde3e1" stroke-width="1"/>')
b+=['</svg>']
(ROOT/'symbols.svg').write_text(''.join(b))
print(f'{len(glyphs)} glyphs; both pangrams cover their full alphabets')
