// App.js
const { useState } = React;

window.App = function App() {
    const [apiKey, setApiKey] = useState('');
    const [robotPrompt, setRobotPrompt] = useState(window.DEFAULT_ROBOT_PROMPT);
    const [worldPrompt, setWorldPrompt] = useState(window.DEFAULT_WORLD_PROMPT);
    const [model, setModel] = useState('gemini-1.5-pro');
    const [iterations, setIterations] = useState(20);
    const [results, setResults] = useState([]);
    const [isRunning, setIsRunning] = useState(false);
    const [error, setError] = useState(null);

    const generateContent = async (request) => {
        try {
            console.log('Making request:', request);
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
                mode: 'cors'
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('API Error:', errorText);
                throw new Error(`API error: ${response.status} - ${errorText}`);
            }

            const data = await response.json();
            console.log('API Response:', data);
            return data;
        } catch (error) {
            console.error('Generate Content Error:', error);
            throw error;
        }
    };

    const runSimulation = async () => {
        if (!apiKey) {
            setError('Please enter a Gemini API key');
            return;
        }
        setIsRunning(true);
        setError(null);
        setResults([]);
        try {
            let agentReq = {
                systemInstruction: {
                    parts: [{ text: robotPrompt }]
                },
                contents: [
                    {
                        role: "user",
                        parts: [{ text: "BEGIN" }]
                    }
                ],
                safetySettings: [
                    {
                        category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_HATE_SPEECH",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_HARASSMENT",
                        threshold: "BLOCK_NONE"
                    },
                    {
                        category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                        threshold: "BLOCK_NONE"
                    }
                ]
            };
            let worldReq = {
                systemInstruction: {
                    parts: [{ text: worldPrompt + `The players system instruction is:

BEGIN_PLAYER_SI:
` + robotPrompt + `
END_PLAYER_SI` }]
                },
                contents: [],
                safetySettings: agentReq.safetySettings
            };

            for (let i = 0; i < iterations; i++) {
                console.log(`Iteration ${i + 1} starting...`);

                const agentResp = await generateContent(agentReq);
                const agentContent = agentResp.candidates[0].content;
                const agentText = agentContent.parts[0].text;
                agentReq.contents.push(agentContent);
                worldReq.contents.push({
                    role: "user",
                    parts: [{ text: agentText }]
                });
                const worldResp = await generateContent(worldReq);
                const worldContent = worldResp.candidates[0].content;
                const worldText = worldContent.parts[0].text;

                agentReq.contents.push({
                    role: "user",
                    parts: [{ text: worldText }]
                });
                worldReq.contents.push(worldContent);

                setResults(prev => [...prev, {
                    iteration: i + 1,
                    agent: agentText,
                    world: worldText
                }]);
                console.log(`Iteration ${i + 1} completed`);
            }
        } catch (err) {
            console.error('Simulation Error:', err);
            setError(`Error: ${err.message}`);
        } finally {
            setIsRunning(false);
        }
    };

    const downloadResults = () => {
        const content = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Simulation Results</title>
    <link href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css" rel="stylesheet">
    <style>
        pre {
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>
<body class="bg-gray-100">
    <div class="max-w-4xl mx-auto p-4">
        <h1 class="text-2xl font-bold mb-4">Simulation Results</h1>
        <div class="mb-4">
            <h2 class="text-xl font-semibold">Robot Prompt</h2>
            <pre class="bg-blue-50 p-3 rounded">${robotPrompt}</pre>
        </div>
        <div class="mb-4">
            <h2 class="text-xl font-semibold">World Prompt</h2>
            <pre class="bg-green-50 p-3 rounded">${worldPrompt}</pre>
        </div>
        <div>
            <h2 class="text-xl font-semibold">Results</h2>
            ${results.map(result => `
                <div class="mb-4">
                    <h3 class="font-bold">Iteration ${result.iteration}</h3>
                    <div class="bg-blue-50 p-3 rounded mb-2">
                        <strong>Agent:</strong>
                        <pre>${result.agent}</pre>
                    </div>
                    <div class="bg-green-50 p-3 rounded">
                        <strong>World:</strong>
                        <pre>${result.world}</pre>
                    </div>
                </div>
            `).join('')}
        </div>
    </div>
</body>
</html>`;

        const blob = new Blob([content], { type: 'text/html' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'simulation_results.html';
        link.click();
    };
    
    return (
        <div className="max-w-4xl mx-auto p-4 space-y-4">
            <div className="bg-white rounded-lg shadow-lg p-6 space-y-4">
                <h1 className="text-2xl font-bold">Alignment Simulator</h1>
                <div className="space-y-2">
                    <label className="block font-medium">Gemini API Key</label>
                    <input
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="w-full p-2 border rounded"
                        placeholder="Enter your Gemini API key"
                    />
                    <div className="text-sm text-gray-600 space-y-1">
                        <a 
                            href="https://aistudio.google.com/app/apikey" 
                            target="_blank" 
                            className="text-blue-500 hover:underline"
                        >
                            Create your API key via Google AI Studio.
                        </a>
                        <div>
                            Enable billing for best results.
                        </div>
                        <div>
                            Your API key is not stored anywhere.
                        </div>
                    </div>
                </div>
                <div className="space-y-2">
                    <label className="block font-medium">Robot Prompt</label>
                    <textarea
                        value={robotPrompt}
                        onChange={(e) => setRobotPrompt(e.target.value)}
                        className="w-full h-40 p-2 border rounded"
                    />
                </div>
                <div className="space-y-2">
                    <label className="block font-medium">World Prompt</label>
                    <textarea
                        value={worldPrompt}
                        onChange={(e) => setWorldPrompt(e.target.value)}
                        className="w-full h-40 p-2 border rounded"
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="block font-medium">Gemini Model</label>
                        <input
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="w-full p-2 border rounded"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="block font-medium">Number of Iterations</label>
                        <input
                            type="number"
                            value={iterations}
                            onChange={(e) => setIterations(parseInt(e.target.value))}
                            min="1"
                            max="100"
                            className="w-full p-2 border rounded"
                        />
                    </div>
                </div>
                <button
                    onClick={runSimulation}
                    disabled={isRunning}
                    className={`w-full p-2 rounded text-white ${isRunning ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'}`}
                >
                    {isRunning ? 'Running...' : 'Run Simulation'}
                </button>
                <button
                    onClick={downloadResults}
                    disabled={results.length === 0}
                    className={`w-full p-2 rounded text-white ${results.length === 0 ? 'bg-gray-400' : 'bg-green-500 hover:bg-green-600'}`}
                >
                    Download Results as HTML
                </button>
                {error && (
                    <div className="flex items-center gap-2 text-red-600">
                        <span>⚠️</span>
                        <span>{error}</span>
                    </div>
                )}
            </div>
            {results.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-xl font-bold mb-4">Results</h2>
                    <div className="space-y-4">
                        {results.map((result) => (
                            <div key={result.iteration} className="space-y-2">
                                <div className="font-semibold">Iteration {result.iteration}</div>
                                <div className="bg-blue-50 p-3 rounded">
                                    <div className="font-medium">Agent:</div>
                                    <div className="whitespace-pre-wrap">{result.agent}</div>
                                </div>
                                <div className="bg-green-50 p-3 rounded">
                                    <div className="font-medium">World:</div>
                                    <div className="whitespace-pre-wrap">{result.world}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
