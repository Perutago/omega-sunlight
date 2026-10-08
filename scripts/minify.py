import urllib.request
import urllib.parse
import sys
import os

def minify_js(file_path):
    if not file_path.endswith('.js') or file_path.endswith('.min.js'):
        return
    
    print(f"Minifying {file_path}...")
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            js_code = f.read()
            # 内部の import や sw.js などの参照先も minify されたファイルに向くように書き換える
            js_code = js_code.replace(".js'", ".min.js'").replace('.js"', '.min.js"')
            js_code = js_code.replace(".js`", ".min.js`")
    except Exception as e:
        print(f"Error: Could not read file {file_path}: {e}")
        return

    url = 'https://www.toptal.com/developers/javascript-minifier/api/raw'
    data = urllib.parse.urlencode({'input': js_code}).encode('utf-8')
    req = urllib.request.Request(url, data=data, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Content-Type': 'application/x-www-form-urlencoded'
    })
    
    try:
        with urllib.request.urlopen(req) as response:
            minified = response.read().decode('utf-8')
            
        out_path = file_path[:-3] + '.min.js'
        with open(out_path, 'w', encoding='utf-8') as f:
            f.write(minified)
        print(f"Success: Saved minified file to {out_path}")
    except Exception as e:
        print(f"Error: Failed to minify {file_path}: {e}")

if __name__ == "__main__":
    # 対象のファイルが引数で指定された場合
    if len(sys.argv) > 1:
        for arg in sys.argv[1:]:
            minify_js(arg)
    else:
        # 引数がない場合は js/ 以下のすべての .js を対象にする
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        js_dir = os.path.join(base_dir, 'js')
        
        if os.path.exists(js_dir):
            for filename in os.listdir(js_dir):
                if filename.endswith('.js') and not filename.endswith('.min.js'):
                    minify_js(os.path.join(js_dir, filename))
        
        # ルートにある sw.js (Service Worker) も対象にする
        sw_path = os.path.join(base_dir, 'sw.js')
        if os.path.exists(sw_path):
            minify_js(sw_path)
