# Minify JavaScript Files

When you modify any JavaScript files (`.js`) in this project, you MUST automatically run the minification script to update the `.min.js` files.

### Instructions:
After editing JavaScript files, run the following command in the terminal from the project root:

```bash
python3 scripts/minify.py
```

This script will automatically minify all non-minified JavaScript files in the `js/` directory and `sw.js`, creating corresponding `.min.js` files using an external API.

Do NOT minify the JavaScript code manually. Always use this script.
