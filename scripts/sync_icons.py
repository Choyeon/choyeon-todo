from PIL import Image
import os, shutil

src_png = r'd:\WebProjects\choyeon-todo-tmp\src\assets\choyeon-todo.png'
build_dir = r'd:\WebProjects\choyeon-todo-tmp\build'
src_dir = r'd:\WebProjects\choyeon-todo-tmp\src\assets'

main = Image.open(src_png)
print(f'Main icon: {main.size}')

# 关键修复：从 256x256 版本保存多尺寸 ICO
# PIL 12 需要先 resize 到最大尺寸再 save 才能正确包含所有 sizes
ico_base = main.resize((256, 256), Image.LANCZOS)
sizes_ico = [(16,16),(24,24),(32,32),(48,48),(64,64),(128,128),(256,256)]

ico_src_path = os.path.join(src_dir, 'choyeon-todo.ico')
ico_base.save(ico_src_path, format='ICO', sizes=sizes_ico)
sz1 = os.path.getsize(ico_src_path)
print(f'src/assets/choyeon-todo.ico: {sz1//1024} KB')

ico_build_path = os.path.join(build_dir, 'icon.ico')
shutil.copy2(ico_src_path, ico_build_path)
sz2 = os.path.getsize(ico_build_path)
print(f'build/icon.ico: {sz2//1024} KB')

# build/icon.png (512x512 for electron-builder)
icon_512 = main.resize((512,512), Image.LANCZOS)
p = os.path.join(build_dir, 'icon.png')
icon_512.save(p, 'PNG')
print(f'build/icon.png: {os.path.getsize(p)//1024} KB')

# 各尺寸 PNG
for size in [16,32,48,64,128,256,512]:
    src = os.path.join(src_dir, f'choyeon-todo-{size}x{size}.png')
    dest = os.path.join(build_dir, f'icon-{size}x{size}.png')
    if os.path.exists(src):
        shutil.copy2(src, dest)
    else:
        main.resize((size,size), Image.LANCZOS).save(dest, 'PNG')

# public/favicon.png (48x48)
public_dir = r'd:\WebProjects\choyeon-todo-tmp\public'
fav = main.resize((48,48), Image.LANCZOS)
fav.save(os.path.join(public_dir, 'favicon.png'), 'PNG')
print(f'public/favicon.png: {os.path.getsize(os.path.join(public_dir, "favicon.png"))} B')

print('All icons synced!')
