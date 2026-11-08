import re, os
ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
S=lambda n: open(os.path.join(ROOT,'src',n)).read()
m0=S('params.template.html')
defs=re.search(r'(const SYS_VERSION[\s\S]*?\n\];)',m0).group(1)
html=f'''<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Бизнес-калькулятор</title><style>
{S('app.css')}</style></head><body>
{S('app.body.html')}
<script>
{defs}
{S('engine.js')}
{S('finmodel.js')}
{S('analysis.js')}
{S('storage.js')}
{S('glossary.js') if os.path.exists(os.path.join(ROOT,'src','glossary.js')) else ''}
{S('app.js')}
</script></body></html>'''
os.makedirs(os.path.join(ROOT,'www'),exist_ok=True)
open(os.path.join(ROOT,'www','index.html'),'w').write(html)
# экран параметров: только уровень «для всех проектов», ссылка назад
p=m0
p=p.replace('<title>M0 · Мастер-данные — прототип</title>','<title>Параметры — Бизнес-калькулятор</title>')
p=p.replace('<h1>Мастер-данные · параметры расчёта</h1>','<h1><a href="index.html" style="text-decoration:none">←</a> Параметры расчёта</h1>')
p=p.replace('<div class="seg" id="levels">','<div class="seg" id="levels" style="display:none">')
p=p.replace('<meta name="viewport" content="width=device-width, initial-scale=1">','<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">')
p=p.replace('header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:12px 14px 10px}','header{position:sticky;top:0;z-index:5;background:var(--card);border-bottom:1px solid var(--line);padding:calc(12px + env(safe-area-inset-top)) 14px 10px}')
p=p.replace('footer{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);padding:8px 12px;','footer{position:fixed;bottom:0;left:0;right:0;background:var(--card);border-top:1px solid var(--line);padding:8px 12px calc(8px + env(safe-area-inset-bottom));')
open(os.path.join(ROOT,'www','params.html'),'w').write(p)
print('built www/index.html, www/params.html')
