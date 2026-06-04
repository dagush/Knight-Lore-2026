export default [
    {
        output: {
            filename: 'jsspeccy/jsspeccy.js',
        },
        name: 'jsspeccy',
        entry: './runtime/jsspeccy.js',
        mode: 'production',
        module: {
            rules: [
                {
                    test: /\.svg$/,
                    type: 'asset/source',
                }
            ],
        }
    },
    {
        output: {
            filename: 'jsspeccy/jsspeccy-worker.js',
        },
        name: 'worker',
        entry: './runtime/worker.js',
        mode: 'production',
    },
];
