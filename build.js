const fs = require('fs');
const path = require('path');

// Create production build
console.log('🚀 Creating production build...');

// Copy necessary files for frontend deployment
const filesToCopy = [
    'index.html',
    'styles.css', 
    'script.js',
    'package.json',
    'package-lock.json',
    'netlify.toml',
    'README.md',
    'models',
    'netlify'
];

// Create build directory
const buildDir = 'build';
if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
}

// Copy files
filesToCopy.forEach(file => {
    if (fs.existsSync(file)) {
        if (fs.lstatSync(file).isDirectory()) {
            // Copy directory recursively
            const copyDir = (src, dest) => {
                if (!fs.existsSync(dest)) {
                    fs.mkdirSync(dest, { recursive: true });
                }
                const items = fs.readdirSync(src);
                items.forEach(item => {
                    const srcPath = path.join(src, item);
                    const destPath = path.join(dest, item);
                    if (fs.lstatSync(srcPath).isDirectory()) {
                        copyDir(srcPath, destPath);
                    } else {
                        fs.copyFileSync(srcPath, destPath);
                    }
                });
            };
            copyDir(file, path.join(buildDir, file));
            console.log(`✅ Copied directory: ${file}`);
        } else {
            fs.copyFileSync(file, path.join(buildDir, file));
            console.log(`✅ Copied file: ${file}`);
        }
    } else {
        console.log(`⚠️  File not found: ${file}`);
    }
});

console.log('✅ Production build completed!');
console.log('📁 Build files are in the "build" directory');
console.log('🌐 Ready for Netlify deployment!');
