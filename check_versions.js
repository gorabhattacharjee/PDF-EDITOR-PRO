
const fs = require('fs');

try {
    const lockFile = fs.readFileSync('c:/pdf-editor-pro/frontend/package-lock.json', 'utf8');
    const lock = JSON.parse(lockFile);

    const searchPackages = [
        'react-server-dom-webpack',
        'react-server-dom-parcel',
        'react-server-dom-turbopack',
        'react-server-dom-vite',
        'next',
        'react'
    ];

    console.log("Checking package versions in package-lock.json...");

    function checkDeps(deps, path = '') {
        if (!deps) return;
        for (const [name, details] of Object.entries(deps)) {
            if (searchPackages.includes(name)) {
                console.log(`Found ${name} version: ${details.version} at ${path}/${name}`);
            }
            if (details.dependencies) {
                checkDeps(details.dependencies, `${path}/${name}`);
            }
        }
    }

    // Check packages (npm v2/v3 lockfile structure)
    if (lock.packages) {
        for (const [path, details] of Object.entries(lock.packages)) {
            const name = path.replace('node_modules/', '');
            if (searchPackages.includes(name)) {
                console.log(`Found ${name} version: ${details.version} (in packages)`);
            }
        }
    } else if (lock.dependencies) {
        checkDeps(lock.dependencies);
    }

} catch (e) {
    console.error("Error reading lockfile:", e.message);
}
